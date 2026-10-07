import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { AttendanceSummary } from "@/lib/payroll/types";

// HR integration placeholder (IAttendancePeriodSummaryProvider — study 8.5): attendance totals per employee × period.
// Filters: ?employeeId=emp-011  ?period=2026-09
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const employeeId = params.get("employeeId");
    const period = params.get("period");
    const rows = await collection<AttendanceSummary>("hr/attendance-summary.json");
    return rows.filter((r) => (!employeeId || r.employeeId === employeeId) && (!period || r.periodId === period));
  });
}
