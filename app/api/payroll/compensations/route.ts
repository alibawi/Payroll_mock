import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES, loadBundle, minimumWage, previewOf } from "@/lib/payroll/compensation-server";
import { collection } from "@/lib/payroll/store";
import type { EmployeeCompensation, EmployeeCompensationComponent } from "@/lib/payroll/types";
import { compensationStatus } from "@/lib/payroll/compensation-validation";
import type { Employee } from "@/lib/types/hr";

// One row per payroll-relevant employee (archived staff are left out) with the compensation that is
// current today, its projected gross/net, and flags for the "no compensation" / "below minimum" alerts.
// Filters: ?profileId=pf-gov  ?department=<name>  ?paymentMethod=Bank  ?none=true  ?q=<text>
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const profileId = params.get("profileId");
    const department = params.get("department");
    const paymentMethod = params.get("paymentMethod");
    const none = params.get("none") === "true";
    const q = params.get("q")?.trim().toLowerCase();

    const [employees, records, overrides, bundle, wage] = await Promise.all([
      collection<Employee>(COMP_FILES.employees),
      collection<EmployeeCompensation>(COMP_FILES.compensations),
      collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
      loadBundle(),
      minimumWage(),
    ]);

    const rows = employees
      .filter((e) => e.status !== "archived")
      .map((employee) => {
        const own = records
          .filter((r) => r.employeeId === employee.id)
          .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
        const current = own.find((r) => compensationStatus(r) === "Current") ?? null;
        // Leavers keep their last (closed) record visible so the list still explains who they were paid as.
        const shown = current ?? (own.find((r) => compensationStatus(r) === "Superseded") ?? null);
        const withOverrides = shown && { ...shown, overrides: overrides.filter((o) => o.compensationId === shown.id) };
        const preview = withOverrides ? previewOf({ ...withOverrides, status: compensationStatus(shown!) }, bundle) : null;
        return {
          employee,
          compensation: shown,
          isCurrent: Boolean(current),
          hasUpcoming: own.some((r) => compensationStatus(r) === "Upcoming"),
          recordCount: own.length,
          gross: preview?.gross ?? null,
          net: preview?.net ?? null,
          belowMinimum: Boolean(shown && shown.baseSalary != null && shown.baseSalary < wage),
          missing: own.length === 0 && (employee.status === "active" || employee.status === "on_leave"),
        };
      })
      .filter(
        (r) =>
          (!profileId || r.compensation?.profileId === profileId) &&
          (!department || r.employee.department === department || r.employee.departmentEn === department) &&
          (!paymentMethod || r.compensation?.paymentMethod === paymentMethod) &&
          (!none || r.missing) &&
          (!q ||
            [r.employee.fullNameAr, r.employee.fullNameEn, r.employee.employeeCode].some((v) => v.toLowerCase().includes(q)))
      );
    return rows;
  });
}
