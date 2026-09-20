import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { AttendanceRecord } from "@/lib/types/hr";

// HR integration placeholder (IAttendancePeriodSummaryProvider raw data).
// Filters: ?employeeId=  ?from=YYYY-MM-DD  ?to=YYYY-MM-DD
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const employeeId = params.get("employeeId");
    const from = params.get("from");
    const to = params.get("to");

    const records = await collection<AttendanceRecord>("hr/attendance.json");
    return records.filter(
      (r) =>
        (!employeeId || r.employeeId === employeeId) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to)
    );
  });
}
