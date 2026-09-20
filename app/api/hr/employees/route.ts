import { mockResponse } from "@/lib/mock-api";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";

// HR integration placeholder (IEmployeePayrollSnapshotProvider — study 8.5).
// Filters: ?status=active,on_leave  ?employmentType=Permanent  ?department=<name>  ?q=<text>
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const statuses = params.get("status")?.split(",").filter(Boolean);
    const employmentType = params.get("employmentType");
    const department = params.get("department");
    const q = params.get("q")?.trim().toLowerCase();

    const employees = await collection<Employee>("hr/employees.json");
    return employees.filter(
      (e) =>
        (!statuses || statuses.includes(e.status)) &&
        (!employmentType || e.employmentType === employmentType) &&
        (!department || e.department === department || e.departmentEn === department) &&
        (!q ||
          [e.fullNameAr, e.fullNameEn, e.employeeCode].some((v) => v.toLowerCase().includes(q)))
    );
  });
}
