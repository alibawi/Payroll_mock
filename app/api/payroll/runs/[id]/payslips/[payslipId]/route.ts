import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { MockApiError, mockResponse } from "@/lib/mock-api";
import { findPeriod, findRun, requirePermission, runRole, RUN_FILES, visiblePayslips } from "@/lib/payroll/run-server";
import { MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { PayrollDeductionScheduleItem, PayrollRun, Payslip, PayslipLineRecord } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string; payslipId: string }> };

// GET /api/payroll/runs/[id]/payslips/[payslipId] — one payslip with its lines, the calculation trace and the
// instalments behind its deductions. Employees may only open their own payslip of a posted run (spec §7).
export async function GET(request: Request, { params }: Params) {
  const { id, payslipId } = await params;
  return mockResponse(request, async () => {
    const role = runRole(request);
    const run = await findRun(id);
    const payslip = (await collection<Payslip>(RUN_FILES.payslips)).find((p) => p.id === payslipId && p.runId === id);
    if (!payslip) throw new MockApiError(404, `Payslip ${payslipId} not found`);
    if (role === "employee") {
      if (payslip.employeeId !== MOCK_EMPLOYEE_ID || !["Posted", "Paid"].includes(run.status)) {
        throw new MockApiError(403, "Employees may only open their own posted payslips");
      }
    } else {
      requirePermission(request, "payroll.run", "view");
      if ((await visiblePayslips(request, [payslip])).length === 0) throw new MockApiError(403, "Payslip is outside your department");
    }

    const [period, lines, schedule, employees, runs, all] = await Promise.all([
      findPeriod(run.payrollPeriodId),
      collection<PayslipLineRecord>(RUN_FILES.lines),
      collection<PayrollDeductionScheduleItem>(RUN_FILES.schedule),
      collection<Employee>(COMP_FILES.employees),
      collection<PayrollRun>(RUN_FILES.runs),
      collection<Payslip>(RUN_FILES.payslips),
    ]);
    const previousRun = runs
      .filter((r) => r.profileId === run.profileId && r.runType === "Regular" && r.periodKey < run.periodKey && ["Posted", "Paid"].includes(r.status))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))[0];
    const previous = previousRun ? all.find((p) => p.runId === previousRun.id && p.employeeId === payslip.employeeId) : undefined;
    return {
      run: { id: run.id, runNo: run.runNo, status: run.status, periodKey: run.periodKey, runType: run.runType, profileId: run.profileId, journalRef: run.journalRef },
      period,
      payslip,
      lines: lines.filter((l) => l.payslipId === payslipId).sort((a, b) => a.sequence - b.sequence),
      schedule: schedule.filter((s) => s.payslipId === payslipId),
      employee: employees.find((e) => e.id === payslip.employeeId) ?? null,
      previous: previous ? { periodKey: previous.periodKey, netPay: previous.netPay, grossPay: previous.grossPay } : null,
    };
  });
}
