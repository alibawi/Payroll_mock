import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES, loadBundle, minimumWage, previewOf } from "@/lib/payroll/compensation-server";
import { compensationStatus } from "@/lib/payroll/compensation-validation";
import { collection } from "@/lib/payroll/store";
import type {
  CompensationActivity,
  EmployeeCompensation,
  EmployeeCompensationComponent,
} from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// KPIs for the compensation list (spec §6).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [employees, records, overrides, activity, bundle, wage] = await Promise.all([
      collection<Employee>(COMP_FILES.employees),
      collection<EmployeeCompensation>(COMP_FILES.compensations),
      collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
      collection<CompensationActivity>(COMP_FILES.activity),
      loadBundle(),
      minimumWage(),
    ]);

    const payable = employees.filter((e) => e.status === "active" || e.status === "on_leave");
    const currents = records.filter((r) => compensationStatus(r) === "Current");
    const withSalary = payable.filter((e) => currents.some((r) => r.employeeId === e.id));
    const withoutSalary = payable.filter((e) => !records.some((r) => r.employeeId === e.id));

    const byProfile = bundle.profiles.map((profile) => {
      const mine = currents.filter((r) => r.profileId === profile.id);
      const grosses = mine.map(
        (r) =>
          previewOf(
            { ...r, status: "Current", overrides: overrides.filter((o) => o.compensationId === r.id) },
            bundle
          ).gross
      );
      return {
        profileId: profile.id,
        code: profile.code,
        name: profile.name,
        count: mine.length,
        averageGross: grosses.length ? Math.round(grosses.reduce((a, b) => a + b, 0) / grosses.length) : 0,
      };
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return {
      payableEmployees: payable.length,
      withSalary: withSalary.length,
      withoutSalary: withoutSalary.map((e) => ({ id: e.id, fullNameAr: e.fullNameAr, fullNameEn: e.fullNameEn })),
      byProfile,
      changesLast30Days: activity.filter((a) => a.timestamp >= thirtyDaysAgo && a.timestamp <= new Date().toISOString()).length,
      belowMinimumWage: currents
        .filter((r) => r.baseSalary != null && r.baseSalary < wage)
        .map((r) => ({
          employeeId: r.employeeId,
          baseSalary: r.baseSalary,
          fullNameAr: employees.find((e) => e.id === r.employeeId)?.fullNameAr,
          fullNameEn: employees.find((e) => e.id === r.employeeId)?.fullNameEn,
        })),
      minimumWage: wage,
    };
  });
}
