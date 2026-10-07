import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { MockApiError } from "@/lib/mock-api";
import { DEPT_HEAD_DEPARTMENT } from "@/lib/payroll/permissions";
import { RUN_FILES, requirePermission, runRole } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { PayrollRun, Payslip, PayslipLineRecord } from "@/lib/payroll/types";

// Server helpers of the reporting Route Handlers: reports are derived from the payslips of regular runs (spec §2.2).

export const REPORT_FILES = {
  eos: "payroll/end-of-service.json",
  eosActivity: "payroll/end-of-service-activity-log.json",
  remittances: "payroll/remittance-status.json",
  balances: "hr/leave-balances.json",
} as const;

/** Reports are for payroll staff and department heads; an employee only gets their own payslip. */
export function requireReportAccess(request: Request) {
  if (runRole(request) === "employee") throw new MockApiError(403, "Employees may only open their own payslip");
  requirePermission(request, "payroll.report", "view");
}

export type ReportSource = {
  periodKey: string;
  runs: PayrollRun[];
  payslips: Payslip[];
  lines: PayslipLineRecord[];
  employees: Employee[];
  /** T-1: true when any included run is not yet Posted / Paid. */
  isDraft: boolean;
};

/** Payslips of the regular, non-reversed runs of a period (optionally one profile), scoped to the caller's role. */
export async function loadReportSource(request: Request, periodKey: string, profileId?: string | null): Promise<ReportSource> {
  const [runs, payslips, lines, employees] = await Promise.all([
    collection<PayrollRun>(RUN_FILES.runs),
    collection<Payslip>(RUN_FILES.payslips),
    collection<PayslipLineRecord>(RUN_FILES.lines),
    collection<Employee>(COMP_FILES.employees),
  ]);
  const chosen = runs.filter((r) => r.periodKey === periodKey && r.runType === "Regular" && r.status !== "Reversed" && (!profileId || r.profileId === profileId));
  const ids = new Set(chosen.map((r) => r.id));
  let mine = payslips.filter((p) => ids.has(p.runId));
  if (runRole(request) === "deptHead") {
    const dept = new Set(employees.filter((e) => e.department === DEPT_HEAD_DEPARTMENT).map((e) => e.id));
    mine = mine.filter((p) => dept.has(p.employeeId));
  }
  const slipIds = new Set(mine.map((p) => p.id));
  return {
    periodKey,
    runs: chosen,
    payslips: mine,
    lines: lines.filter((l) => slipIds.has(l.payslipId)),
    employees,
    isDraft: chosen.some((r) => !["Posted", "Paid"].includes(r.status)),
  };
}

/** The latest period that has a regular run past approval (default period of every report). */
export async function defaultPeriodKey(): Promise<string> {
  const runs = await collection<PayrollRun>(RUN_FILES.runs);
  const keys = runs.filter((r) => r.runType === "Regular" && ["Posted", "Paid"].includes(r.status)).map((r) => r.periodKey).sort();
  return keys[keys.length - 1] ?? "2026-09";
}

export const periodParam = async (request: Request) => new URL(request.url).searchParams.get("periodKey") ?? (await defaultPeriodKey());

export const sumLines = (lines: PayslipLineRecord[], pick: (l: PayslipLineRecord) => boolean) => lines.filter(pick).reduce((s, l) => s + l.amount, 0);
