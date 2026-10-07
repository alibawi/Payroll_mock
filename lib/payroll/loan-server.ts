import { MockApiError } from "@/lib/mock-api";
import { actorFrom, assertValid, CONFIG_FILES } from "@/lib/payroll/config-server";
import { COMP_FILES, loadBundle, previewOf, recordsOf } from "@/lib/payroll/compensation-server";
import { capCheck, validateLoanDraft, type LoanDraftInput } from "@/lib/payroll/loans";
import { can, DEPT_HEAD_DEPARTMENT, MOCK_EMPLOYEE_ID, type PayrollAction } from "@/lib/payroll/permissions";
import { CURRENT_PERIOD } from "@/lib/payroll/periods";
import { collection, insertItem } from "@/lib/payroll/store";
import { isRole } from "@/lib/payroll/roles";
import type { Employee } from "@/lib/types/hr";
import type {
  EmployeeLoan,
  EmployeeLoanInstallment,
  FieldErrors,
  GlAccount,
  LoanActivity,
  LocalizedText,
} from "@/lib/payroll/types";

export const LOAN_FILES = {
  loans: "payroll/loans.json",
  installments: "payroll/loan-installments.json",
  activity: "payroll/loan-activity-log.json",
} as const;

/** The mock role from `x-mock-role`, or null when the caller did not send one. */
export function roleOf(request: Request) {
  const value = request.headers.get("x-mock-role");
  return isRole(value) ? value : null;
}

/** HTTP 403 when a role is sent and lacks the action (no header = demo/curl access, always allowed). */
export function requireLoanPermission(request: Request, action: PayrollAction) {
  const role = roleOf(request);
  if (role && !can(role, "payroll.loan", action)) {
    throw new MockApiError(403, `Role ${role} may not ${action} loans`);
  }
}

export async function findLoan(id: string): Promise<EmployeeLoan> {
  const loan = (await collection<EmployeeLoan>(LOAN_FILES.loans)).find((l) => l.id === id);
  if (!loan) throw new MockApiError(404, `Loan ${id} not found`);
  return loan;
}

export async function installmentsOf(loanId: string): Promise<EmployeeLoanInstallment[]> {
  return (await collection<EmployeeLoanInstallment>(LOAN_FILES.installments))
    .filter((i) => i.loanId === loanId)
    .sort((a, b) => a.seqNo - b.seqNo);
}

export async function appendLoanActivity(
  request: Request,
  loanId: string,
  action: LoanActivity["action"],
  summary: LocalizedText
) {
  const log = await collection<LoanActivity>(LOAN_FILES.activity);
  return insertItem<LoanActivity>(LOAN_FILES.activity, {
    id: `la-${String(log.length + 1).padStart(3, "0")}-${Date.now().toString(36)}`,
    loanId,
    action,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    summary,
  });
}

export async function nextLoanNumber() {
  const loans = await collection<EmployeeLoan>(LOAN_FILES.loans);
  const max = loans.reduce((m, l) => Math.max(m, Number(l.loanNo.split("-")[2]) || 0), 0);
  return { n: max + 1, loanNo: `LN-2026-${String(max + 1).padStart(4, "0")}` };
}

export async function nextJournalRef() {
  const loans = await collection<EmployeeLoan>(LOAN_FILES.loans);
  const used = loans.map((l) => Number(l.journalRef?.split("-")[2]) || 0);
  return `JV-EMPLOAN-${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
}

export async function accountNames(): Promise<Record<string, LocalizedText>> {
  const accounts = await collection<GlAccount>(CONFIG_FILES.glAccounts);
  return Object.fromEntries(accounts.map((a) => [a.code, a.name]));
}

/** L-12: at most one unsettled salary advance per employee. */
export async function assertNoOpenAdvance(employeeId: string, exceptLoanId?: string) {
  const open = (await collection<EmployeeLoan>(LOAN_FILES.loans)).find(
    (l) =>
      l.employeeId === employeeId &&
      l.id !== exceptLoanId &&
      l.loanType === "SalaryAdvance" &&
      ["PendingApproval", "Approved", "Disbursed", "Active"].includes(l.status)
  );
  if (open) {
    assertValid({
      loanType: {
        rule: "L-12",
        message: {
          ar: `للموظف سلفة غير مسددة (${open.loanNo}) — لا سلفة جديدة قبل تسديدها`,
          en: `The employee already has an unsettled advance (${open.loanNo}) — no new advance until it is settled`,
        },
      },
    });
  }
}

/** L-1: the employee needs a compensation that is current today (the instalment is taken from payroll). */
export async function assertHasCompensation(employeeId: string) {
  const current = (await recordsOf(employeeId)).find((r) => r.status === "Current");
  if (!current) {
    assertValid({
      employeeId: {
        rule: "L-1",
        message: { ar: "الموظف بلا تعويض نافذ — لا يمكن الاستقطاع من راتبه", en: "The employee has no current compensation — nothing to deduct from" },
      },
    });
  }
  return current!;
}

/** Scope rules of the self-service roles when creating a request. */
export async function assertCanRequestFor(request: Request, employeeId: string) {
  const role = roleOf(request);
  if (role === "employee" && employeeId !== MOCK_EMPLOYEE_ID) {
    throw new MockApiError(403, "Employees may only request loans for themselves");
  }
  if (role === "deptHead") {
    const employee = (await collection<Employee>(COMP_FILES.employees)).find((e) => e.id === employeeId);
    if (employee && employee.department !== DEPT_HEAD_DEPARTMENT) {
      throw new MockApiError(403, "Department heads may only request loans for their own department");
    }
  }
}

/** L-11 / L-13 preview: this instalment plus the other instalments due the same month vs the monthly cap. */
export async function capContext(employeeId: string, installment: number, periodId: string, exceptLoanId?: string) {
  const [records, bundle, installments, loans] = await Promise.all([
    recordsOf(employeeId),
    loadBundle(),
    collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
    collection<EmployeeLoan>(LOAN_FILES.loans),
  ]);
  const current = records.find((r) => r.status === "Current");
  if (!current) return null;
  const gross = previewOf(current, bundle).gross;
  const capPercent = bundle.profiles.find((p) => p.id === current.profileId)?.attendancePenaltyPolicy.maxMonthlyDeductionPercent ?? 25;
  const mine = new Set(loans.filter((l) => l.employeeId === employeeId && l.id !== exceptLoanId).map((l) => l.id));
  const otherDeductions = installments
    .filter((i) => mine.has(i.loanId) && i.status === "Pending" && i.duePeriodId === periodId)
    .reduce((sum, i) => sum + i.amount, 0);
  return { gross, capPercent, otherDeductions, ...capCheck({ gross, capPercent, otherDeductions, installment }) };
}

export function validateDraftOrThrow(input: Partial<LoanDraftInput>): FieldErrors {
  const errors = validateLoanDraft(input);
  if (input.firstDeductionPeriodId && input.firstDeductionPeriodId < CURRENT_PERIOD) {
    errors.firstDeductionPeriodId = {
      rule: "L-3",
      message: { ar: "أول استقطاع لا يسبق الفترة المفتوحة", en: "First deduction cannot precede the open period" },
    };
  }
  assertValid(errors);
  return errors;
}
