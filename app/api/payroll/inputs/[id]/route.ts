import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { fail, requirePermission, RUN_FILES } from "@/lib/payroll/run-server";
import { collection, updateItem } from "@/lib/payroll/store";
import type { PayrollInput, PayrollRun } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

// POST /api/payroll/inputs/[id] { action: "cancel" } — a pending input can be cancelled unless a run in progress holds it.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.input", "update");
    const body = await readJson<{ action?: string }>(request);
    const input = (await collection<PayrollInput>(RUN_FILES.inputs)).find((i) => i.id === id);
    if (!input) throw new MockApiError(404, `Input ${id} not found`);
    if (body.action !== "cancel") throw new MockApiError(400, `Unknown action ${body.action}`);
    if (input.status !== "Pending") {
      throw fail(409, "Only a pending input can be cancelled", "I-STATE", "يمكن إلغاء مدخل معلّق فقط", "Only a pending input can be cancelled");
    }
    const run = input.appliedRunId ? (await collection<PayrollRun>(RUN_FILES.runs)).find((r) => r.id === input.appliedRunId) : undefined;
    if (run && !["Draft", "Calculated"].includes(run.status)) {
      throw fail(409, "A run in progress holds this input", "I-STATE", `الدورة ${run.runNo} تحتجز المدخل`, `Run ${run.runNo} holds this input`);
    }
    return updateItem<PayrollInput>(RUN_FILES.inputs, id, { status: "Cancelled", appliedRunId: null });
  });
}
