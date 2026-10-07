import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { EOS_ACTIONS } from "@/lib/payroll/eos";
import {
  appendEosActivity,
  eosRole,
  findEos,
  nextEosJournalRef,
  nextEosPaymentRef,
  paymentJournal,
  requireEosPermission,
} from "@/lib/payroll/eos-server";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { fail } from "@/lib/payroll/run-server";
import type { PayrollAction } from "@/lib/payroll/permissions";
import { updateItem } from "@/lib/payroll/store";
import type { EndOfServiceCalculation } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };
type Body = { action: "approve" | "pay" | "cancel" | "comment" | "previewJournal"; text?: string; reason?: string };

const REQUIRED: Record<Body["action"], PayrollAction> = { approve: "approve", pay: "pay", cancel: "cancel", comment: "view", previewJournal: "view" };

// Draft → Approved → Paid (+ Cancelled from Draft / Approved) — gap G4.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const body = await readJson<Body>(request);
    if (!REQUIRED[body.action]) throw new MockApiError(400, `Unknown action ${body.action}`);
    requireEosPermission(request, REQUIRED[body.action]);
    const eos = await findEos(id);
    const now = new Date().toISOString();
    const patch = (p: Partial<EndOfServiceCalculation>) => updateItem<EndOfServiceCalculation>(REPORT_FILES.eos, id, { ...p, updatedAt: now });

    if (body.action === "comment") {
      if (!body.text?.trim()) throw new MockApiError(422, "Comment text is required");
      await appendEosActivity(request, id, "Comment", { ar: body.text.trim(), en: body.text.trim() });
      return { eos };
    }
    if (body.action === "previewJournal") return { journal: await paymentJournal(eos), journalRef: await nextEosJournalRef(), paymentRef: await nextEosPaymentRef() };

    if (!(EOS_ACTIONS[eos.status] as string[]).includes(body.action)) {
      throw fail(409, `Action ${body.action} is not available in status ${eos.status}`, "T-STATE", `الإجراء غير متاح بحالة «${eos.status}»`, `Action not available in status “${eos.status}”`);
    }
    switch (body.action) {
      case "approve": {
        if (eos.totalAmount <= 0) throw fail(422, "Nothing to approve", "T-6", "المبلغ صفر — لا اعتماد", "The amount is zero — nothing to approve");
        const updated = await patch({ status: "Approved", approvedBy: eosRole(request) ?? "hrManager", approvedAt: now });
        await appendEosActivity(request, id, "Approved", { ar: "اعتماد المطالبة", en: "Claim approved" });
        return { eos: updated };
      }
      case "pay": {
        const journalRef = await nextEosJournalRef();
        const paymentRef = await nextEosPaymentRef();
        const updated = await patch({ status: "Paid", journalRef, paymentRef, paidAt: now });
        await appendEosActivity(request, id, "Paid", { ar: `دفع المطالبة — ${paymentRef}`, en: `Claim paid — ${paymentRef}` });
        return { eos: updated, journal: await paymentJournal(eos), journalRef, paymentRef };
      }
      case "cancel": {
        const updated = await patch({ status: "Cancelled" });
        await appendEosActivity(request, id, "Cancelled", { ar: body.reason ? `إلغاء المطالبة: ${body.reason}` : "إلغاء المطالبة", en: body.reason ? `Claim cancelled: ${body.reason}` : "Claim cancelled" });
        return { eos: updated };
      }
    }
  });
}
