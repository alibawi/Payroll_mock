import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { PENALTY_ACTIONS } from "@/lib/payroll/penalties";
import {
  appendPenaltyActivity,
  findPenalty,
  PENALTY_FILES,
  penaltyInstallments,
  penaltyRole,
  planPenalty,
  requirePenaltyPermission,
} from "@/lib/payroll/penalty-server";
import { insertItem, removeItem, updateItem } from "@/lib/payroll/store";
import type { DisciplinaryPenalty, PenaltyInstallment } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };
type Body = { action: "approve" | "cancel" | "comment"; reason?: string; text?: string };

// State machine of a penalty (spec §3): Draft → Approved (generates the instalments) → Applying → Applied, or Cancelled
// before any deduction. Applying/Applied are reached by payroll posting (module 5), not from the UI.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const body = await readJson<Body>(request);
    const penalty = await findPenalty(id);
    const now = new Date().toISOString();

    if (body.action === "comment") {
      requirePenaltyPermission(request, "view");
      if (!body.text?.trim()) throw new MockApiError(422, "Comment text is required");
      await appendPenaltyActivity(request, id, "Comment", { ar: body.text.trim(), en: body.text.trim() });
      return { penalty };
    }

    if (!PENALTY_ACTIONS[penalty.status].includes(body.action)) {
      throw new MockApiError(409, `Action ${body.action} is not available in status ${penalty.status}`, {
        form: { rule: "P-STATE", message: { ar: `الإجراء غير متاح بحالة «${penalty.status}»`, en: `Action not available in status “${penalty.status}”` } },
      });
    }

    if (body.action === "approve") {
      requirePenaltyPermission(request, "approve");
      // Instalments are generated at approval (P-3/P-4 against the cap as it stands now).
      const { plan, amount } = await planPenalty(penalty, id);
      if (plan.blocked) {
        throw new MockApiError(422, "Validation failed", { spreadOverMonths: { rule: "P-5", message: { ar: "لا يمكن الجدولة ضمن السقف الشهري", en: "Cannot be scheduled under the monthly cap" } } });
      }
      for (const row of plan.rows) {
        await insertItem<PenaltyInstallment>(PENALTY_FILES.installments, {
          id: `${id}-i${row.seqNo}`,
          penaltyId: id,
          seqNo: row.seqNo,
          duePeriodId: row.duePeriodId,
          amount: row.amount,
          deductedAmount: 0,
          status: "Pending",
          payslipId: null,
        });
      }
      const updated = await updateItem<DisciplinaryPenalty>(PENALTY_FILES.penalties, id, {
        status: "Approved",
        computedAmount: amount,
        remainingAmount: amount,
        spreadOverMonths: plan.months,
        approvedBy: penaltyRole(request) ?? "hrManager",
        approvedAt: now,
        updatedAt: now,
      });
      await appendPenaltyActivity(request, id, "Approved", { ar: `اعتماد العقوبة وتوليد ${plan.months} قسط`, en: `Approved; ${plan.months} instalment(s) generated` });
      return { penalty: updated };
    }

    // cancel: a draft needs `update`, an approved one `approve`; never after a deduction
    requirePenaltyPermission(request, penalty.status === "Draft" ? "update" : "approve");
    const rows = await penaltyInstallments(id);
    if (rows.some((r) => r.status === "Deducted")) {
      throw new MockApiError(409, "A penalty with deductions cannot be cancelled");
    }
    // the pending instalments of a cancelled penalty are dropped so payroll never picks them up
    for (const row of rows) await removeItem(PENALTY_FILES.installments, row.id);
    const updated = await updateItem<DisciplinaryPenalty>(PENALTY_FILES.penalties, id, { status: "Cancelled", remainingAmount: 0, updatedAt: now });
    await appendPenaltyActivity(request, id, "Cancelled", { ar: body.reason ? `إلغاء العقوبة: ${body.reason}` : "إلغاء العقوبة", en: body.reason ? `Penalty cancelled: ${body.reason}` : "Penalty cancelled" });
    return { penalty: updated };
  });
}
