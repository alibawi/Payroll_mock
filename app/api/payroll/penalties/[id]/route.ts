import { MockApiError, mockResponse } from "@/lib/mock-api";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { assertValid, readJson } from "@/lib/payroll/config-server";
import { validatePenaltyDraft, type PenaltyDraft } from "@/lib/payroll/penalties";
import {
  appendPenaltyActivity,
  findPenalty,
  PENALTY_FILES,
  penaltyInstallments,
  planPenalty,
  requirePenaltyPermission,
} from "@/lib/payroll/penalty-server";
import { collection, updateItem } from "@/lib/payroll/store";
import type { DisciplinaryPenalty, PenaltyActivity } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const penalty = await findPenalty(id);
    const [installments, activity, employees] = await Promise.all([
      penaltyInstallments(id),
      collection<PenaltyActivity>(PENALTY_FILES.activity),
      collection<Employee>(COMP_FILES.employees),
    ]);
    // A draft has no instalment rows yet: show the plan that approval would generate.
    let plan = null;
    if (penalty.status === "Draft") {
      try {
        plan = (await planPenalty(penalty, id)).plan;
      } catch {
        plan = null;
      }
    }
    return {
      penalty,
      installments,
      plan,
      activity: activity.filter((a) => a.penaltyId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      employee: employees.find((e) => e.id === penalty.employeeId) ?? null,
    };
  });
}

// Draft-only edit; the amount and months are recomputed.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requirePenaltyPermission(request, "update");
    const before = await findPenalty(id);
    if (before.status !== "Draft") throw new MockApiError(409, "Only a draft penalty can be edited");

    const patch = await readJson<Partial<PenaltyDraft> & { comments?: string }>(request);
    const merged = {
      penaltyType: before.penaltyType,
      value: before.value,
      reason: before.reason,
      decisionRef: before.decisionRef,
      decisionDate: before.decisionDate,
      spreadOverMonths: before.spreadOverMonths,
      startPeriodId: before.startPeriodId,
      ...patch,
      employeeId: before.employeeId,
    } as PenaltyDraft;
    assertValid(validatePenaltyDraft(merged));

    const { amount, plan } = await planPenalty(merged, id);
    if (plan.blocked) {
      assertValid({ spreadOverMonths: { rule: "P-5", message: { ar: "القسط يتجاوز السقف الشهري", en: "The instalment exceeds the monthly cap" } } });
    }
    const after = (await updateItem<DisciplinaryPenalty>(PENALTY_FILES.penalties, id, {
      penaltyType: merged.penaltyType,
      value: merged.penaltyType === "OneMonthSalary" ? null : Number(merged.value),
      computedAmount: amount,
      remainingAmount: amount,
      reason: merged.reason.trim(),
      decisionRef: merged.decisionRef.trim(),
      decisionDate: merged.decisionDate,
      spreadOverMonths: plan.months,
      startPeriodId: merged.startPeriodId,
      comments: patch.comments ?? before.comments,
      updatedAt: new Date().toISOString(),
    }))!;
    await appendPenaltyActivity(request, id, "Updated", { ar: "تعديل العقوبة", en: "Penalty edited" });
    return after;
  });
}
