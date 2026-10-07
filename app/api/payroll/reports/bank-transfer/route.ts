import { mockResponse } from "@/lib/mock-api";
import { loadReportSource, periodParam, requireReportAccess } from "@/lib/payroll/report-server";

// GET /api/payroll/reports/bank-transfer?periodKey=&profileId=
// The bank transfer file (T-3): Bank-paid employees only; those without an account number are listed separately.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const profileId = new URL(request.url).searchParams.get("profileId");
    const source = await loadReportSource(request, await periodParam(request), profileId);
    const bank = source.payslips.filter((p) => p.paymentMethod === "Bank" && p.netPay > 0);
    const rows = bank.map((p) => ({
      payslipId: p.id,
      employee: source.employees.find((e) => e.id === p.employeeId) ?? null,
      bankAccountNo: p.bankAccountNo,
      netPay: p.netPay,
      paidStatus: p.paidStatus,
      costCenterId: p.costCenterId,
    }));
    return {
      periodKey: source.periodKey,
      isDraft: source.isDraft,
      rows,
      missingAccount: rows.filter((r) => !r.bankAccountNo).length,
      total: rows.reduce((s, r) => s + r.netPay, 0),
      cashExcluded: source.payslips.filter((p) => p.paymentMethod === "Cash").length,
    };
  });
}
