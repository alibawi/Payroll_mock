import { MockApiError } from "@/lib/mock-api";
import { actorFrom, assertValid } from "@/lib/payroll/config-server";
import { COMP_FILES, loadBundle, previewOf, recordsOf } from "@/lib/payroll/compensation-server";
import { dayRate } from "@/lib/payroll/attendance";
import { computePenaltyAmount, monthlyCapacity, planSpread, type SpreadPlan } from "@/lib/payroll/netProtection";
import { LOAN_FILES } from "@/lib/payroll/loan-server";
import { can, DEPT_HEAD_DEPARTMENT, type PayrollAction } from "@/lib/payroll/permissions";
import type { PenaltyDraft } from "@/lib/payroll/penalties";
import { isRole } from "@/lib/payroll/roles";
import { collection, insertItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  AttendanceSummary,
  DisciplinaryPenalty,
  EmployeeLoan,
  EmployeeLoanInstallment,
  LocalizedText,
  PenaltyActivity,
  PenaltyInstallment,
} from "@/lib/payroll/types";

export const PENALTY_FILES = {
  penalties: "payroll/penalties.json",
  installments: "payroll/penalty-installments.json",
  activity: "payroll/penalty-activity-log.json",
  attendance: "hr/attendance-summary.json",
} as const;

export function penaltyRole(request: Request) {
  const value = request.headers.get("x-mock-role");
  return isRole(value) ? value : null;
}

/** HTTP 403 when a role is sent and lacks the action (no header = demo/curl access, always allowed). */
export function requirePenaltyPermission(request: Request, action: PayrollAction) {
  const role = penaltyRole(request);
  if (role && !can(role, "payroll.penalty", action)) {
    throw new MockApiError(403, `Role ${role} may not ${action} penalties`);
  }
}

export async function findPenalty(id: string): Promise<DisciplinaryPenalty> {
  const penalty = (await collection<DisciplinaryPenalty>(PENALTY_FILES.penalties)).find((p) => p.id === id);
  if (!penalty) throw new MockApiError(404, `Penalty ${id} not found`);
  return penalty;
}

export async function penaltyInstallments(penaltyId: string): Promise<PenaltyInstallment[]> {
  return (await collection<PenaltyInstallment>(PENALTY_FILES.installments))
    .filter((i) => i.penaltyId === penaltyId)
    .sort((a, b) => a.seqNo - b.seqNo);
}

export async function appendPenaltyActivity(request: Request, penaltyId: string, action: PenaltyActivity["action"], summary: LocalizedText) {
  const log = await collection<PenaltyActivity>(PENALTY_FILES.activity);
  return insertItem<PenaltyActivity>(PENALTY_FILES.activity, {
    id: `pa-${String(log.length + 1).padStart(3, "0")}-${Date.now().toString(36)}`,
    penaltyId,
    action,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    summary,
  });
}

export async function nextPenaltyNumber() {
  const all = await collection<DisciplinaryPenalty>(PENALTY_FILES.penalties);
  const max = all.reduce((m, p) => Math.max(m, Number(p.penaltyNo.split("-")[2]) || 0), 0);
  return { n: max + 1, penaltyNo: `PEN-2026-${String(max + 1).padStart(4, "0")}` };
}

/** P-12: the employee needs a compensation that is current today. */
export async function assertHasCompensation(employeeId: string) {
  const current = (await recordsOf(employeeId)).find((r) => r.status === "Current");
  if (!current) {
    assertValid({
      employeeId: {
        rule: "P-12",
        message: { ar: "الموظف بلا تعويض نافذ — لا عقوبة مالية عليه", en: "The employee has no current compensation — no financial penalty can be applied" },
      },
    });
  }
  return current!;
}

export async function assertCanProposeFor(request: Request, employeeId: string) {
  const role = penaltyRole(request);
  if (role === "employee") throw new MockApiError(403, "Employees cannot create penalties");
  if (role === "deptHead") {
    const e = (await collection<Employee>(COMP_FILES.employees)).find((x) => x.id === employeeId);
    if (e && e.department !== DEPT_HEAD_DEPARTMENT) throw new MockApiError(403, "Department heads may only propose penalties for their own department");
  }
}

/** Pay context of an employee: gross, day-rate basis, day rate, the profile's cap and over-breach action. */
export async function payContext(employeeId: string) {
  const [current, bundle, attendance] = await Promise.all([
    assertHasCompensation(employeeId),
    loadBundle(),
    collection<AttendanceSummary>(PENALTY_FILES.attendance),
  ]);
  const preview = previewOf(current, bundle);
  const profile = bundle.profiles.find((p) => p.id === current.profileId)!;
  const policy = profile.attendancePenaltyPolicy;
  const basis = preview.lines
    .filter((l) => l.componentType === "Earning" && policy.absenceDayRateComponentCodes.includes(l.componentCode))
    .reduce((sum, l) => sum + l.amount, 0);
  const latest = attendance.filter((a) => a.employeeId === employeeId).sort((a, b) => b.periodId.localeCompare(a.periodId))[0];
  const days = { workingDays: latest?.workingDays ?? 26, calendarDays: latest?.calendarDays ?? 30 };
  return { current, preview, profile, policy, monthlyBasic: basis, dayRate: dayRate(basis, profile, days), gross: preview.gross };
}

/** Deductions already due per period for this employee: pending loan instalments + other penalties' pending instalments. */
export async function othersByPeriod(employeeId: string, exceptPenaltyId?: string): Promise<Record<string, number>> {
  const [loans, loanRows, penalties, penaltyRows] = await Promise.all([
    collection<EmployeeLoan>(LOAN_FILES.loans),
    collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
    collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
    collection<PenaltyInstallment>(PENALTY_FILES.installments),
  ]);
  const mineLoans = new Set(loans.filter((l) => l.employeeId === employeeId).map((l) => l.id));
  const minePenalties = new Set(penalties.filter((p) => p.employeeId === employeeId && p.id !== exceptPenaltyId).map((p) => p.id));
  const totals: Record<string, number> = {};
  for (const r of loanRows) if (mineLoans.has(r.loanId) && r.status === "Pending") totals[r.duePeriodId] = (totals[r.duePeriodId] ?? 0) + r.amount;
  for (const r of penaltyRows) if (minePenalties.has(r.penaltyId) && r.status === "Pending") totals[r.duePeriodId] = (totals[r.duePeriodId] ?? 0) + r.amount;
  return totals;
}

/** P-1 → P-5: amount and the instalment plan under the monthly cap. */
export async function planPenalty(draft: Pick<PenaltyDraft, "employeeId" | "penaltyType" | "value" | "spreadOverMonths" | "startPeriodId">, exceptPenaltyId?: string) {
  const ctx = await payContext(draft.employeeId);
  const others = await othersByPeriod(draft.employeeId, exceptPenaltyId);
  const amount = computePenaltyAmount(draft.penaltyType, draft.value, { dayRate: ctx.dayRate, monthlyBasic: ctx.monthlyBasic });
  const capacityOf = (period: string) => monthlyCapacity(ctx.gross, ctx.policy.maxMonthlyDeductionPercent, others[period] ?? 0);
  const plan: SpreadPlan = planSpread({
    amount,
    type: draft.penaltyType,
    requestedMonths: draft.spreadOverMonths,
    startPeriodId: draft.startPeriodId,
    capacityOf,
    action: ctx.policy.overBreachAction,
  });
  return { amount, plan, ctx, capPercent: ctx.policy.maxMonthlyDeductionPercent, overBreachAction: ctx.policy.overBreachAction };
}
