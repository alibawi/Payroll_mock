import { mockResponse } from "@/lib/mock-api";
import { loadReportSource, periodParam, requireReportAccess } from "@/lib/payroll/report-server";
import type { Payslip, PayslipLineRecord } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

export type RegisterRow = {
  payslipId: string;
  runId: string;
  employeeId: string;
  employee: Employee | null;
  costCenterId: string | null;
  basic: number;
  allowances: number;
  grossEarnings: number;
  attendance: number;
  statutory: number;
  tax: number;
  loans: number;
  penalties: number;
  other: number;
  net: number;
  paymentMethod: Payslip["paymentMethod"];
};

const ZERO = { basic: 0, allowances: 0, grossEarnings: 0, attendance: 0, statutory: 0, tax: 0, loans: 0, penalties: 0, other: 0, net: 0 };
type Totals = typeof ZERO;
const KEYS = Object.keys(ZERO) as (keyof Totals)[];
const add = (a: Totals, r: Totals): Totals => Object.fromEntries(KEYS.map((k) => [k, a[k] + r[k]])) as Totals;

// GET /api/payroll/reports/register?periodKey=&profileId=&department=&groupBy=department|costCenter
// The monthly payroll register: one row per employee with the pay split into columns, grouped with totals.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const params = new URL(request.url).searchParams;
    const source = await loadReportSource(request, await periodParam(request), params.get("profileId"));
    const groupBy = params.get("groupBy") === "costCenter" ? "costCenter" : "department";
    const department = params.get("department");

    const linesBy = new Map<string, PayslipLineRecord[]>();
    for (const l of source.lines) linesBy.set(l.payslipId, [...(linesBy.get(l.payslipId) ?? []), l]);

    const rows: RegisterRow[] = source.payslips
      .map((p) => {
        const lines = linesBy.get(p.id) ?? [];
        const sum = (f: (l: PayslipLineRecord) => boolean) => lines.filter(f).reduce((s, l) => s + l.amount, 0);
        const deduction = (l: PayslipLineRecord) => l.componentType === "Deduction" && l.source !== "Attendance";
        const basic = sum((l) => l.componentType === "Earning" && l.category === "Basic");
        return {
          payslipId: p.id,
          runId: p.runId,
          employeeId: p.employeeId,
          employee: source.employees.find((e) => e.id === p.employeeId) ?? null,
          costCenterId: p.costCenterId,
          basic,
          allowances: p.grossEarnings - basic,
          grossEarnings: p.grossEarnings,
          attendance: p.absenceDeduction + p.latenessDeduction,
          statutory: sum((l) => deduction(l) && (l.category === "StatutoryPension" || l.category === "StatutorySocialSecurity")),
          tax: sum((l) => deduction(l) && l.category === "IncomeTax"),
          loans: sum((l) => deduction(l) && l.category === "LoanRepayment"),
          penalties: sum((l) => deduction(l) && l.category === "DisciplinaryPenalty"),
          other: sum((l) => deduction(l) && !["StatutoryPension", "StatutorySocialSecurity", "IncomeTax", "LoanRepayment", "DisciplinaryPenalty"].includes(l.category)),
          net: p.netPay,
          paymentMethod: p.paymentMethod,
        };
      })
      .filter((r) => !department || r.employee?.department === department || r.employee?.departmentEn === department);

    const groups = new Map<string, { key: string; labelAr: string; labelEn: string; rows: RegisterRow[] }>();
    for (const r of rows) {
      const key = groupBy === "department" ? (r.employee?.department ?? "—") : (r.costCenterId ?? "—");
      const g = groups.get(key) ?? { key, labelAr: key, labelEn: groupBy === "department" ? (r.employee?.departmentEn ?? key) : key, rows: [] };
      g.rows.push(r);
      groups.set(key, g);
    }
    const out = [...groups.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => (a.employee?.employeeCode ?? "").localeCompare(b.employee?.employeeCode ?? "")), totals: g.rows.reduce<Totals>((t, r) => add(t, r), ZERO) }));
    return {
      periodKey: source.periodKey,
      isDraft: source.isDraft,
      runs: source.runs.map((r) => ({ id: r.id, runNo: r.runNo, status: r.status, profileId: r.profileId })),
      groupBy,
      groups: out,
      totals: rows.reduce<Totals>((t, r) => add(t, r), ZERO),
      count: rows.length,
      departments: [...new Set(source.employees.filter((e) => source.payslips.some((p) => p.employeeId === e.id)).map((e) => e.department))],
    };
  });
}
