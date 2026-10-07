import { mockResponse } from "@/lib/mock-api";
import { MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { RUN_FILES } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { PayrollRun, Payslip } from "@/lib/payroll/types";

// GET /api/payroll/my-payslips — the signed-in employee's payslips of posted runs (self-service, spec §7).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [runs, payslips] = await Promise.all([collection<PayrollRun>(RUN_FILES.runs), collection<Payslip>(RUN_FILES.payslips)]);
    const visible = new Map(runs.filter((r) => ["Posted", "Paid"].includes(r.status)).map((r) => [r.id, r]));
    return payslips
      .filter((p) => p.employeeId === MOCK_EMPLOYEE_ID && visible.has(p.runId))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
      .map((p) => ({
        id: p.id,
        runId: p.runId,
        runNo: visible.get(p.runId)!.runNo,
        runType: visible.get(p.runId)!.runType,
        periodKey: p.periodKey,
        grossPay: p.grossPay,
        totalEmployeeDeductions: p.totalEmployeeDeductions,
        netPay: p.netPay,
        paidStatus: p.paidStatus,
        paidDate: p.paidDate,
      }));
  });
}
