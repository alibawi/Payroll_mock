import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { collection } from "@/lib/payroll/store";
import type { ConfigActivity } from "@/lib/payroll/types";

// Config audit trail. Filters: ?entityType=component  ?entityId=pc-01
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const entityType = params.get("entityType");
    const entityId = params.get("entityId");
    const log = await collection<ConfigActivity>(CONFIG_FILES.activityLog);
    return log
      .filter((a) => (!entityType || a.entityType === entityType) && (!entityId || a.entityId === entityId))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });
}
