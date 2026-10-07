import { runGolden } from "@/lib/payroll/__golden__/golden";
import { COMP_FILES, loadBundle } from "@/lib/payroll/compensation-server";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { EmployeeCompensation, EmployeeCompensationComponent, GlAccount } from "@/lib/payroll/types";

// GET /api/payroll/golden — runs the study's worked examples 12.1–12.4 through the calculation engine (spec §6).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [bundle, compensations, overrides, accounts] = await Promise.all([
      loadBundle(),
      collection<EmployeeCompensation>(COMP_FILES.compensations),
      collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
      collection<GlAccount>(CONFIG_FILES.glAccounts),
    ]);
    const scenarios = runGolden({ bundle, compensations, overrides, accounts });
    return { scenarios, passed: scenarios.every((s) => s.passed), ranAt: new Date().toISOString() };
  });
}
