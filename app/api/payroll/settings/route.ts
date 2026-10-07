import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { collection, updateItem } from "@/lib/payroll/store";
import type { PayrollSettings } from "@/lib/payroll/types";

// Module-level payroll settings (currently the minimum wage used by rule E-3).
export async function GET(request: Request) {
  return mockResponse(request, async () => (await collection<PayrollSettings>(COMP_FILES.settings))[0]);
}

export async function PATCH(request: Request) {
  return mockResponse(request, async () => {
    const { minimumWage } = await readJson<Partial<PayrollSettings>>(request);
    if (typeof minimumWage !== "number" || !(minimumWage > 0)) throw new MockApiError(422, "minimumWage must be a positive number");
    return updateItem<PayrollSettings>(COMP_FILES.settings, "settings", { minimumWage });
  });
}
