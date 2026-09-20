import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { LeaveRequest } from "@/lib/types/hr";

// HR integration placeholder (ILeavePeriodProvider raw data). Filter: ?employeeId=
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const employeeId = new URL(request.url).searchParams.get("employeeId");
    const requests = await collection<LeaveRequest>("hr/leave-requests.json");
    return requests.filter((r) => !employeeId || r.employeeId === employeeId);
  });
}
