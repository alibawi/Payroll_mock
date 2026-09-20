import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { RewardDisciplineRecord } from "@/lib/types/hr";

// HR register of rewards and disciplinary decisions. Filters: ?employeeId=  ?type=reward|disciplinary
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const employeeId = params.get("employeeId");
    const type = params.get("type");
    const records = await collection<RewardDisciplineRecord>("hr/rewards-discipline.json");
    return records.filter((r) => (!employeeId || r.employeeId === employeeId) && (!type || r.type === type));
  });
}
