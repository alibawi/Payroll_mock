import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { collection } from "@/lib/payroll/store";
import type { GlAccount } from "@/lib/payroll/types";

// Finance/GL integration placeholder — the chart of accounts payroll components post to.
export async function GET(request: Request) {
  return mockResponse(request, () => collection<GlAccount>(CONFIG_FILES.glAccounts));
}
