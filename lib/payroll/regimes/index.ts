import { iraqGovernment } from "@/lib/payroll/regimes/iraq-government";
import { iraqPrivate } from "@/lib/payroll/regimes/iraq-private";
import type { IPayrollRegimeProvider } from "@/lib/payroll/regimes/types";
import type { PayrollProfile } from "@/lib/payroll/types";

export function regimeFor(profile: Pick<PayrollProfile, "code">): IPayrollRegimeProvider {
  return profile.code === "GOVERNMENT_IQ" ? iraqGovernment : iraqPrivate;
}
