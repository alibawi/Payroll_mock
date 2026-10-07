import { addMonths, periodEnd } from "@/lib/payroll/periods";
import type {
  EmployeeLoan,
  EmployeeLoanInstallment,
  FieldErrors,
  JournalLine,
  LoanType,
} from "@/lib/payroll/types";

// Pure loan logic shared by the Route Handlers and the request form's live schedule preview.

export type ScheduleInput = {
  loanType: LoanType;
  principal: number;
  interestType: "None" | "Flat";
  interestRate: number | null;
  installmentCount: number;
  firstDeductionPeriodId: string;
};

export type ScheduleRow = Pick<EmployeeLoanInstallment, "seqNo" | "duePeriodId" | "dueDate" | "amount">;

export type Schedule = {
  totalRepayable: number;
  installmentCount: number;
  installmentAmount: number;
  rows: ScheduleRow[];
};

/** Instalments are rounded down to the nearest 250 IQD (the profile rounding rule); the last one absorbs the remainder. */
const INSTALLMENT_STEP = 250;

/**
 * L-2 / L-3: a personal loan is `(principal + optional flat interest) ÷ count`, the last instalment absorbing
 * rounding; a salary advance is a single instalment for the whole amount in the first (= next) payroll.
 * Flat interest is taken as a one-off percentage of the principal for the whole term.
 */
export function buildSchedule(input: ScheduleInput): Schedule {
  const interest =
    input.loanType === "PersonalLoan" && input.interestType === "Flat"
      ? Math.round((input.principal * (input.interestRate ?? 0)) / 100)
      : 0;
  const totalRepayable = input.principal + interest;
  const count = input.loanType === "SalaryAdvance" ? 1 : Math.max(1, Math.floor(input.installmentCount));

  const base = count === 1 ? totalRepayable : Math.floor(totalRepayable / count / INSTALLMENT_STEP) * INSTALLMENT_STEP;
  const rows: ScheduleRow[] = Array.from({ length: count }, (_, i) => {
    const duePeriodId = addMonths(input.firstDeductionPeriodId, i);
    const amount = i === count - 1 ? totalRepayable - base * (count - 1) : base;
    return { seqNo: i + 1, duePeriodId, dueDate: periodEnd(duePeriodId), amount };
  });
  return { totalRepayable, installmentCount: count, installmentAmount: base, rows };
}

export type LoanDraftInput = ScheduleInput & {
  employeeId: string;
  reason: string;
  guarantorEmployeeId: string | null;
};

/** Field-level validation of a loan request (the L-rules that need no other data). */
export function validateLoanDraft(input: Partial<LoanDraftInput>): FieldErrors {
  const err = (rule: string, ar: string, en: string) => ({ rule, message: { ar, en } });
  const errors: FieldErrors = {};
  if (!input.employeeId) errors.employeeId = err("L-1", "الموظف مطلوب", "Employee is required");
  if (!input.loanType) errors.loanType = err("L-2", "نوع الطلب مطلوب", "Type is required");
  if (!(Number(input.principal) > 0)) errors.principal = err("L-2", "المبلغ يجب أن يكون موجباً", "Amount must be positive");
  if (input.loanType === "PersonalLoan") {
    const n = Number(input.installmentCount);
    if (!Number.isInteger(n) || n < 1 || n > 60) errors.installmentCount = err("L-2", "عدد الأقساط بين 1 و60", "Instalment count must be between 1 and 60");
    if (input.interestType === "Flat" && !(Number(input.interestRate) > 0 && Number(input.interestRate) <= 100)) {
      errors.interestRate = err("L-2", "نسبة الفائدة بين 0 و100", "Interest rate must be between 0 and 100");
    }
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.firstDeductionPeriodId ?? "")) {
    errors.firstDeductionPeriodId = err("L-3", "فترة أول استقطاع مطلوبة", "First deduction period is required");
  }
  if (!input.reason?.trim()) errors.reason = err("L-1", "السبب مطلوب", "Reason is required");
  if (input.guarantorEmployeeId && input.guarantorEmployeeId === input.employeeId) {
    errors.guarantorEmployeeId = err("L-1", "الكفيل لا يكون الموظف نفسه", "The guarantor cannot be the employee");
  }
  return errors;
}

/** L-11 / L-13: monthly deductions (this loan's instalment + the other instalments due) against the cap. */
export function capCheck(args: { gross: number; capPercent: number; otherDeductions: number; installment: number }) {
  const cap = Math.round((args.gross * args.capPercent) / 100);
  const total = args.otherDeductions + args.installment;
  return { cap, total, exceeds: args.gross > 0 && total > cap, excess: Math.max(0, total - cap) };
}

/** Journal of a disbursement (L-5): Dr employee loans receivable / Cr cash or bank. */
export function disbursementJournal(loan: Pick<EmployeeLoan, "id" | "principal" | "loanReceivableAccountCode" | "disbursementAccountCode" | "costCenterId" | "loanNo">, names: Record<string, { ar: string; en: string }>): JournalLine[] {
  const name = (code: string) => names[code] ?? { ar: code, en: code };
  return [
    { id: `${loan.id}-j1`, accountCode: loan.loanReceivableAccountCode, accountName: name(loan.loanReceivableAccountCode), debit: loan.principal, credit: 0, memo: loan.loanNo, costCenter: loan.costCenterId ?? undefined },
    { id: `${loan.id}-j2`, accountCode: loan.disbursementAccountCode, accountName: name(loan.disbursementAccountCode), debit: 0, credit: loan.principal, memo: loan.loanNo, costCenter: loan.costCenterId ?? undefined },
  ];
}

/** Journal of a cash early settlement (L-10): Dr cash or bank / Cr employee loans receivable. */
export function cashSettlementJournal(loan: Pick<EmployeeLoan, "id" | "loanReceivableAccountCode" | "disbursementAccountCode" | "costCenterId" | "loanNo">, remaining: number, names: Record<string, { ar: string; en: string }>): JournalLine[] {
  const name = (code: string) => names[code] ?? { ar: code, en: code };
  return [
    { id: `${loan.id}-s1`, accountCode: loan.disbursementAccountCode, accountName: name(loan.disbursementAccountCode), debit: remaining, credit: 0, memo: loan.loanNo, costCenter: loan.costCenterId ?? undefined },
    { id: `${loan.id}-s2`, accountCode: loan.loanReceivableAccountCode, accountName: name(loan.loanReceivableAccountCode), debit: 0, credit: remaining, memo: loan.loanNo, costCenter: loan.costCenterId ?? undefined },
  ];
}

/** Which action buttons a loan offers in each status (spec §3 table). */
export const LOAN_ACTIONS: Record<EmployeeLoan["status"], string[]> = {
  Draft: ["edit", "submit", "cancel"],
  PendingApproval: ["approve", "reject", "cancel"],
  Approved: ["disburse", "cancel"],
  Disbursed: ["earlySettle"],
  Active: ["earlySettle", "defer", "waive"],
  Settled: [],
  Cancelled: [],
};

export const remainingInstallments = (rows: Pick<EmployeeLoanInstallment, "status" | "amount" | "deductedAmount">[]) =>
  rows.filter((r) => r.status === "Pending");
