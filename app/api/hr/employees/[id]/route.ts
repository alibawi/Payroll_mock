import { MockApiError, mockResponse } from "@/lib/mock-api";
import { findById } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const employee = await findById<Employee>("hr/employees.json", id);
    if (!employee) throw new MockApiError(404, `Employee ${id} not found`);
    return employee;
  });
}
