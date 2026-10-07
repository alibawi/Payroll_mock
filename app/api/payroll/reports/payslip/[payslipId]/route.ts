import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { MockApiError, mockResponse } from "@/lib/mock-api";
import { MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { requireReportAccess } from "@/lib/payroll/report-server";
import { RUN_FILES, runRole, visiblePayslips } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { PayrollPeriod, PayrollRun, Payslip, PayslipLineRecord } from "@/lib/payroll/types";

type Params = { params: Promise<{ payslipId: string }> };

// GET /api/payroll/reports/payslip/[payslipId] — the data of the printable payslip (T-1: a draft run is flagged).
// Employees may open only their own payslip of a posted run.
export async function GET(request: Request, { params }: Params) {
  const { payslipId } = await params;
  return mockResponse(request, async () => {
    const payslip = (await collection<Payslip>(RUN_FILES.payslips)).find((p) => p.id === payslipId);
    if (!payslip) throw new MockApiError(404, `Payslip ${payslipId} not found`);
    const run = (await collection<PayrollRun>(RUN_FILES.runs)).find((r) => r.id === payslip.runId)!;
    if (runRole(request) === "employee") {
      if (payslip.employeeId !== MOCK_EMPLOYEE_ID || !["Posted", "Paid"].includes(run.status)) throw new MockApiError(403, "Employees may only open their own posted payslips");
    } else {
      requireReportAccess(request);
      if ((await visiblePayslips(request, [payslip])).length === 0) throw new MockApiError(403, "Payslip is outside your department");
    }
    const [lines, employees, periods] = await Promise.all([
      collection<PayslipLineRecord>(RUN_FILES.lines),
      collection<Employee>(COMP_FILES.employees),
      collection<PayrollPeriod>(RUN_FILES.periods),
    ]);
    return {
      payslip: { ...payslip, trace: [] },
      run: { id: run.id, runNo: run.runNo, status: run.status, runType: run.runType, journalRef: run.journalRef },
      isDraft: !["Posted", "Paid"].includes(run.status),
      period: periods.find((p) => p.id === run.payrollPeriodId) ?? null,
      lines: lines.filter((l) => l.payslipId === payslipId).sort((a, b) => a.sequence - b.sequence),
      employee: employees.find((e) => e.id === payslip.employeeId) ?? null,
    };
  });
}
