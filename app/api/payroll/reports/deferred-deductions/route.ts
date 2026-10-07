import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { mockResponse } from "@/lib/mock-api";
import { requireReportAccess } from "@/lib/payroll/report-server";
import { RUN_FILES, runRole } from "@/lib/payroll/run-server";
import { DEPT_HEAD_DEPARTMENT } from "@/lib/payroll/permissions";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { PayrollDeductionScheduleItem, PayrollRun } from "@/lib/payroll/types";

// GET /api/payroll/reports/deferred-deductions — instalments / penalties / inputs the monthly cap pushed to later
// months (net protection, AutoSpread — study 3.4), with the run they were deferred in.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const [items, runs, employees] = await Promise.all([
      collection<PayrollDeductionScheduleItem>(RUN_FILES.schedule),
      collection<PayrollRun>(RUN_FILES.runs),
      collection<Employee>(COMP_FILES.employees),
    ]);
    const live = new Map(runs.filter((r) => r.status !== "Reversed" && r.status !== "Draft").map((r) => [r.id, r]));
    const dept = runRole(request) === "deptHead";
    const rows = items
      .filter((i) => i.deferredAmount > 0 && live.has(i.runId) && i.status !== "Released")
      .map((i) => {
        const employee = employees.find((e) => e.id === i.employeeId) ?? null;
        const run = live.get(i.runId)!;
        return { ...i, employee, runNo: run.runNo, runStatus: run.status };
      })
      .filter((r) => !dept || r.employee?.department === DEPT_HEAD_DEPARTMENT)
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
    return {
      rows,
      totalDeferred: rows.reduce((s, r) => s + r.deferredAmount, 0),
      employees: new Set(rows.map((r) => r.employeeId)).size,
    };
  });
}
