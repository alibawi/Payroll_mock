import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import {
  appendRunActivity,
  assertNoBlockers,
  assertTransition,
  calculate,
  deleteRun,
  fail,
  findRun,
  pay,
  permissionOf,
  post,
  previewPayment,
  previewPosting,
  requirePermission,
  reverse,
  runRole,
  RUN_FILES,
  setPeriodStatus,
} from "@/lib/payroll/run-server";
import type { RunAction } from "@/lib/payroll/runs";
import { RUN_ACTIONS } from "@/lib/payroll/runs";
import { updateItem } from "@/lib/payroll/store";
import type { PayrollRun } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

type Body = {
  action: RunAction | "comment" | "previewPosting" | "previewPayment";
  reason?: string;
  text?: string;
};

// One endpoint for the whole payroll-cycle state machine (spec §3.1): calculate / recalculate / submit / approve /
// reject / post / pay / reverse / delete, plus comments and the read-only journal previews shown by the post and pay dialogs.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const body = await readJson<Body>(request);
    const run = await findRun(id);
    const now = new Date().toISOString();

    if (body.action === "comment") {
      requirePermission(request, "payroll.run", "view");
      if (!body.text?.trim()) throw new MockApiError(422, "Comment text is required");
      await appendRunActivity(request, id, "Comment", { ar: body.text.trim(), en: body.text.trim() });
      return { run };
    }
    if (body.action === "previewPosting") {
      requirePermission(request, "payroll.run", "view");
      return previewPosting(run);
    }
    if (body.action === "previewPayment") {
      requirePermission(request, "payroll.run", "view");
      return previewPayment(run);
    }
    if (!(body.action in RUN_ACTIONS_FLAT)) throw new MockApiError(400, `Unknown action ${body.action}`);

    const action = body.action as RunAction;
    requirePermission(request, "payroll.run", permissionOf(action));
    assertTransition(run, action);
    const patch = (p: Partial<PayrollRun>) => updateItem<PayrollRun>(RUN_FILES.runs, id, { ...p, updatedAt: now });

    switch (action) {
      case "calculate":
      case "recalculate":
        return { run: await calculate(request, run, action) };

      case "submit": {
        assertNoBlockers(run);
        if (run.employeeCount === 0) {
          throw fail(422, "The run has no payslips", "R-4", "الدورة بلا قسائم — لا إرسال", "The run has no payslips — nothing to submit");
        }
        const updated = await patch({ status: "PendingApproval", submittedAt: now, rejectionReason: null });
        await appendRunActivity(request, id, "Submitted", { ar: "إرسال للاعتماد", en: "Submitted for approval" });
        return { run: updated };
      }

      case "approve": {
        assertNoBlockers(run);
        const updated = await patch({ status: "Approved", approvedAt: now, approvedBy: runRole(request) ?? "hrManager" });
        // the approved regular run locks its period (spec §3.2)
        if (run.runType === "Regular") await setPeriodStatus(run.payrollPeriodId, "Locked");
        await appendRunActivity(request, id, "Approved", { ar: "اعتماد الدورة", en: "Run approved" });
        return { run: updated };
      }

      case "reject": {
        if (!body.reason?.trim()) throw fail(422, "Rejection reason is required", "R-REJECT", "سبب الرفض مطلوب", "A rejection reason is required");
        const updated = await patch({ status: "Calculated", rejectionReason: body.reason.trim(), submittedAt: null });
        await appendRunActivity(request, id, "Rejected", { ar: `رفض الاعتماد: ${body.reason.trim()}`, en: `Approval rejected: ${body.reason.trim()}` });
        return { run: updated };
      }

      case "post":
        return post(request, run);

      case "pay":
        return pay(request, run);

      case "reverse": {
        if (!body.reason?.trim()) throw fail(422, "A reversal reason is required", "R-8", "سبب العكس مطلوب", "A reversal reason is required");
        return reverse(request, run, body.reason.trim());
      }

      case "delete": {
        await deleteRun(request, run);
        return { deleted: true };
      }
    }
  });
}

const RUN_ACTIONS_FLAT = Object.fromEntries(Object.values(RUN_ACTIONS).flat().map((a) => [a, true]));
