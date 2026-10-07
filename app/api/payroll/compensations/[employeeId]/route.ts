import { mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import {
  COMP_FILES,
  createCompensation,
  findEmployee,
  loadBundle,
  minimumWage,
  previewOf,
  recordsOf,
  type AssignBody,
} from "@/lib/payroll/compensation-server";
import { collection } from "@/lib/payroll/store";
import type { CompensationActivity } from "@/lib/payroll/types";

type Params = { params: Promise<{ employeeId: string }> };

// Employee salary card: full dated history (with overrides), the preview of the current record and its audit trail.
export async function GET(request: Request, { params }: Params) {
  const { employeeId } = await params;
  return mockResponse(request, async () => {
    const employee = await findEmployee(employeeId);
    const [records, bundle, activity, wage] = await Promise.all([
      recordsOf(employeeId),
      loadBundle(),
      collection<CompensationActivity>(COMP_FILES.activity),
      minimumWage(),
    ]);
    const current = records.find((r) => r.status === "Current") ?? null;
    return {
      employee,
      records,
      current,
      preview: current ? previewOf(current, bundle) : null,
      activity: activity.filter((a) => a.employeeId === employeeId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      minimumWage: wage,
    };
  });
}

// Assigns a new salary effective from a date. The previous open record is closed the day before (E-1).
export async function POST(request: Request, { params }: Params) {
  const { employeeId } = await params;
  return mockResponse(
    request,
    async () => {
      const body = await readJson<AssignBody>(request);
      const reason = body.changeReason?.trim();
      return createCompensation(request, employeeId, body, {
        action: "Assigned",
        summary: {
          ar: `اعتباراً من ${body.effectiveFrom}${reason ? ` — ${reason}` : ""}`,
          en: `Effective ${body.effectiveFrom}${reason ? ` — ${reason}` : ""}`,
        },
      });
    },
    { status: 201 }
  );
}
