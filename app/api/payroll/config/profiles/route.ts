import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { PayrollProfile } from "@/lib/payroll/types";

/**
 * Profiles are seeded data (GOVERNMENT_IQ / PRIVATE_IQ — study 6); no create/delete.
 * `employeeCount` is derived from HR for now (Permanent → government, everyone else → private);
 * module 2 (EmployeeCompensation.ProfileId) replaces this with the real assignment.
 */
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [profiles, employees] = await Promise.all([
      collection<PayrollProfile>(CONFIG_FILES.profiles),
      collection<Employee>("hr/employees.json"),
    ]);
    const payable = employees.filter((e) => e.status === "active" || e.status === "on_leave");
    return profiles.map((p) => ({
      ...p,
      employeeCount: payable.filter((e) => (e.employmentType === "Permanent") === (p.code === "GOVERNMENT_IQ")).length,
    }));
  });
}
