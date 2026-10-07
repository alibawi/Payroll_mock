import { MockApiError, mockResponse } from "@/lib/mock-api";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { readJson } from "@/lib/payroll/config-server";
import {
  appendLoanActivity,
  assertNoOpenAdvance,
  capContext,
  findLoan,
  installmentsOf,
  LOAN_FILES,
  requireLoanPermission,
  validateDraftOrThrow,
} from "@/lib/payroll/loan-server";
import { buildSchedule, type LoanDraftInput } from "@/lib/payroll/loans";
import { collection, updateItem } from "@/lib/payroll/store";
import type { EmployeeLoan, LoanActivity } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const loan = await findLoan(id);
    const [installments, activity, employees] = await Promise.all([
      installmentsOf(id),
      collection<LoanActivity>(LOAN_FILES.activity),
      collection<Employee>(COMP_FILES.employees),
    ]);
    const first = installments.find((i) => i.status === "Pending") ?? installments[0];
    // L-13: warn when the instalment pushes the month's deductions over the cap.
    const cap = loan.status === "Settled" || loan.status === "Cancelled"
      ? null
      : await capContext(loan.employeeId, loan.installmentAmount, first?.duePeriodId ?? loan.firstDeductionPeriodId, loan.id);
    return {
      loan,
      installments,
      activity: activity.filter((a) => a.loanId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      employee: employees.find((e) => e.id === loan.employeeId) ?? null,
      guarantor: employees.find((e) => e.id === loan.guarantorEmployeeId) ?? null,
      cap,
    };
  });
}

// Draft-only edit; the schedule is recomputed (and regenerated at approval).
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requireLoanPermission(request, "update");
    const before = await findLoan(id);
    if (before.status !== "Draft") throw new MockApiError(409, "Only a draft request can be edited");

    const patch = await readJson<Partial<LoanDraftInput> & { comments?: string }>(request);
    const merged = {
      loanType: before.loanType,
      principal: before.principal,
      interestType: before.interestType,
      interestRate: before.interestRate,
      installmentCount: before.installmentCount,
      firstDeductionPeriodId: before.firstDeductionPeriodId,
      reason: before.reason,
      guarantorEmployeeId: before.guarantorEmployeeId,
      ...patch,
      employeeId: before.employeeId,
    } as LoanDraftInput;
    validateDraftOrThrow(merged);
    if (merged.loanType === "SalaryAdvance") await assertNoOpenAdvance(before.employeeId, id);

    const schedule = buildSchedule(merged);
    const after = (await updateItem<EmployeeLoan>(LOAN_FILES.loans, id, {
      loanType: merged.loanType,
      principal: Number(merged.principal),
      interestType: merged.loanType === "PersonalLoan" && merged.interestType === "Flat" ? "Flat" : "None",
      interestRate: merged.loanType === "PersonalLoan" && merged.interestType === "Flat" ? Number(merged.interestRate) : null,
      totalRepayable: schedule.totalRepayable,
      repaymentMethod: merged.loanType === "SalaryAdvance" ? "FullNextPayroll" : "Installments",
      installmentCount: schedule.installmentCount,
      installmentAmount: schedule.installmentAmount,
      outstandingBalance: schedule.totalRepayable,
      firstDeductionPeriodId: merged.firstDeductionPeriodId,
      reason: merged.reason.trim(),
      guarantorEmployeeId: merged.guarantorEmployeeId ?? null,
      comments: patch.comments ?? before.comments,
      rejectionReason: null,
      updatedAt: new Date().toISOString(),
    }))!;
    await appendLoanActivity(request, id, "Updated", { ar: "تعديل الطلب", en: "Request edited" });
    return after;
  });
}
