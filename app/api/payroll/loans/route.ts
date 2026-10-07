import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { readJson } from "@/lib/payroll/config-server";
import {
  appendLoanActivity,
  assertCanRequestFor,
  assertNoOpenAdvance,
  LOAN_FILES,
  nextLoanNumber,
  requireLoanPermission,
  roleOf,
  validateDraftOrThrow,
} from "@/lib/payroll/loan-server";
import { buildSchedule, type LoanDraftInput } from "@/lib/payroll/loans";
import { DEPT_HEAD_DEPARTMENT, MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { collection, insertItem } from "@/lib/payroll/store";
import type { EmployeeLoan, EmployeeLoanInstallment } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// Filters: ?status=Active,Disbursed  ?type=PersonalLoan  ?employeeId=emp-007  ?period=2026-10 (has an instalment due)
// The mock role (x-mock-role) scopes the list: employees see their own loans, department heads their department.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const statuses = params.get("status")?.split(",").filter(Boolean);
    const type = params.get("type");
    const employeeId = params.get("employeeId");
    const period = params.get("period");
    const role = roleOf(request);

    const [loans, installments, employees] = await Promise.all([
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
      collection<Employee>(COMP_FILES.employees),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));

    return loans
      .filter((l) => {
        const e = byId.get(l.employeeId);
        return (
          (!statuses || statuses.includes(l.status)) &&
          (!type || l.loanType === type) &&
          (!employeeId || l.employeeId === employeeId) &&
          (!period || installments.some((i) => i.loanId === l.id && i.duePeriodId === period && i.status !== "Deducted")) &&
          (role !== "employee" || l.employeeId === MOCK_EMPLOYEE_ID) &&
          (role !== "deptHead" || e?.department === DEPT_HEAD_DEPARTMENT)
        );
      })
      .sort((a, b) => b.loanNo.localeCompare(a.loanNo))
      .map((loan) => {
        const own = installments.filter((i) => i.loanId === loan.id).sort((a, b) => a.seqNo - b.seqNo);
        const next = own.find((i) => i.status === "Pending");
        return {
          ...loan,
          employee: byId.get(loan.employeeId) ?? null,
          nextInstallment: next ? { seqNo: next.seqNo, duePeriodId: next.duePeriodId, amount: next.amount } : null,
          hasDeferred: own.some((i) => i.status === "Deferred"),
        };
      });
  });
}

type CreateBody = Partial<LoanDraftInput> & { loanDate?: string; comments?: string; costCenterId?: string | null };

// Creates a Draft request. The instalment schedule is generated at approval (L-4), not here.
export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requireLoanPermission(request, "create");
      const body = await readJson<CreateBody>(request);
      validateDraftOrThrow(body);
      await assertCanRequestFor(request, body.employeeId!);
      if (body.loanType === "SalaryAdvance") await assertNoOpenAdvance(body.employeeId!);

      const employee = (await collection<Employee>(COMP_FILES.employees)).find((e) => e.id === body.employeeId);
      const schedule = buildSchedule(body as LoanDraftInput);
      const now = new Date().toISOString();
      const { loanNo, n } = await nextLoanNumber();
      const loan: EmployeeLoan = {
        id: `ln-${String(n).padStart(4, "0")}-${Date.now().toString(36)}`,
        loanNo,
        employeeId: body.employeeId!,
        loanType: body.loanType!,
        loanDate: body.loanDate ?? now.slice(0, 10),
        principal: Number(body.principal),
        currencyCode: "IQD",
        interestType: body.loanType === "PersonalLoan" && body.interestType === "Flat" ? "Flat" : "None",
        interestRate: body.loanType === "PersonalLoan" && body.interestType === "Flat" ? Number(body.interestRate) : null,
        totalRepayable: schedule.totalRepayable,
        repaymentMethod: body.loanType === "SalaryAdvance" ? "FullNextPayroll" : "Installments",
        installmentCount: schedule.installmentCount,
        installmentAmount: schedule.installmentAmount,
        firstDeductionPeriodId: body.firstDeductionPeriodId!,
        outstandingBalance: schedule.totalRepayable,
        status: "Draft",
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        guarantorEmployeeId: body.guarantorEmployeeId ?? null,
        reason: body.reason!.trim(),
        costCenterId: body.costCenterId ?? employee?.costCenter ?? null,
        comments: body.comments?.trim() || null,
        loanReceivableAccountCode: "1150",
        disbursementAccountCode: "1120",
        journalEntryId: null,
        journalRef: null,
        createdBy: roleOf(request) ?? "payrollOfficer",
        createdAt: now,
        updatedAt: now,
      };
      await insertItem(LOAN_FILES.loans, loan);
      await appendLoanActivity(request, loan.id, "Created", { ar: "إنشاء الطلب", en: "Request created" });
      return loan;
    },
    { status: 201 }
  );
}
