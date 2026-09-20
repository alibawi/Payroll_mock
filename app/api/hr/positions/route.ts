import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { Position } from "@/lib/types/hr";

export async function GET(request: Request) {
  return mockResponse(request, () => collection<Position>("hr/positions.json"));
}
