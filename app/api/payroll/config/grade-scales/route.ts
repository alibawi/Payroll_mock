import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { collection } from "@/lib/payroll/store";
import type { GovtGradeScale } from "@/lib/payroll/types";

export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const items = await collection<GovtGradeScale>(CONFIG_FILES.gradeScales);
    return items.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  });
}
