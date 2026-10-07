import { mockResponse } from "@/lib/mock-api";
import { LOAN_FILES } from "@/lib/payroll/loan-server";
import { CURRENT_PERIOD } from "@/lib/payroll/periods";
import { collection } from "@/lib/payroll/store";
import type { EmployeeLoan, EmployeeLoanInstallment } from "@/lib/payroll/types";

// KPIs of the loans list (spec §6).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [loans, installments] = await Promise.all([
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
    ]);

    const live = loans.filter((l) => ["Disbursed", "Active"].includes(l.status));
    const dueNow = installments.filter(
      (i) => i.duePeriodId === CURRENT_PERIOD && i.status === "Pending" && live.some((l) => l.id === i.loanId)
    );
    const overdue = installments.filter(
      (i) => i.duePeriodId < CURRENT_PERIOD && i.status === "Pending" && live.some((l) => l.id === i.loanId)
    );
    const deferred = new Set(installments.filter((i) => i.status === "Deferred").map((i) => i.loanId));
    const monthly = live.map((l) => l.installmentAmount);

    return {
      period: CURRENT_PERIOD,
      outstandingTotal: live.reduce((sum, l) => sum + l.outstandingBalance, 0),
      activeCount: live.length,
      pendingApproval: loans.filter((l) => l.status === "PendingApproval").length,
      readyToDisburse: loans.filter((l) => l.status === "Approved").length,
      dueThisMonth: { count: dueNow.length, amount: dueNow.reduce((s, i) => s + i.amount, 0) },
      averageInstallment: monthly.length ? Math.round(monthly.reduce((a, b) => a + b, 0) / monthly.length) : 0,
      overdueOrDeferred: new Set([...overdue.map((i) => i.loanId), ...deferred]).size,
    };
  });
}
