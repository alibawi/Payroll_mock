import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { effectiveStatus } from "@/lib/payroll/config-validation";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  PayrollComponent,
  PayrollProfile,
  PensionConfiguration,
  SalaryStructure,
  SocialSecurityConfiguration,
  TaxConfiguration,
} from "@/lib/payroll/types";

const EXPIRING_DAYS = 90;

// KPI source for the payroll landing page (spec §6).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [components, structures, profiles, tax, pension, ss, employees] = await Promise.all([
      collection<PayrollComponent>(CONFIG_FILES.components),
      collection<SalaryStructure>(CONFIG_FILES.structures),
      collection<PayrollProfile>(CONFIG_FILES.profiles),
      collection<TaxConfiguration>(CONFIG_FILES.tax),
      collection<PensionConfiguration>(CONFIG_FILES.pension),
      collection<SocialSecurityConfiguration>(CONFIG_FILES.socialSecurity),
      collection<Employee>("hr/employees.json"),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + EXPIRING_DAYS * 86_400_000).toISOString().slice(0, 10);
    const dated = [
      ...tax.map((c) => ({ kind: "tax" as const, ...c })),
      ...pension.map((c) => ({ kind: "pension" as const, ...c })),
      ...ss.map((c) => ({ kind: "socialSecurity" as const, ...c })),
    ];
    const expiringSoon = dated
      .filter((c) => effectiveStatus(c, today) === "Current" && c.effectiveTo != null && c.effectiveTo <= horizon)
      .map((c) => ({ kind: c.kind, id: c.id, profileId: c.profileId, effectiveTo: c.effectiveTo! }));

    const payable = employees.filter((e) => e.status === "active" || e.status === "on_leave");
    const employeesByProfile = profiles.map((p) => ({
      profileId: p.id,
      code: p.code,
      name: p.name,
      count: payable.filter((e) => (e.employmentType === "Permanent") === (p.code === "GOVERNMENT_IQ")).length,
    }));
    const topProfile = [...employeesByProfile].sort((a, b) => b.count - a.count)[0];

    const lastUpdated = (items: { createdAt: string }[]) =>
      items.map((i) => i.createdAt).sort().at(-1) ?? null;

    return {
      activeComponents: components.filter((c) => c.isActive).length,
      totalComponents: components.length,
      activeStructures: structures.filter((s) => s.isActive).length,
      employeesByProfile,
      topProfile,
      lastUpdated: { tax: lastUpdated(tax), pension: lastUpdated(pension), socialSecurity: lastUpdated(ss) },
      upcomingChanges: dated.filter((c) => effectiveStatus(c, today) === "Upcoming").length,
      expiringSoon,
    };
  });
}
