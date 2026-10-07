import { mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { planPenalty } from "@/lib/payroll/penalty-server";
import { CURRENT_PERIOD } from "@/lib/payroll/periods";
import type { PenaltyDraft } from "@/lib/payroll/penalties";

// Live amount + instalment plan + cap for the penalty form (P-1…P-5, P-13). Writes nothing.
// Body: { employeeId, penaltyType, value, spreadOverMonths, startPeriodId, exceptPenaltyId? }
export async function POST(request: Request) {
  return mockResponse(request, async () => {
    const body = await readJson<Partial<PenaltyDraft> & { exceptPenaltyId?: string }>(request);
    const { amount, plan, ctx, capPercent, overBreachAction } = await planPenalty(
      {
        employeeId: body.employeeId!,
        penaltyType: body.penaltyType ?? "FixedAmount",
        value: body.value ?? null,
        spreadOverMonths: Number(body.spreadOverMonths) || 1,
        startPeriodId: body.startPeriodId || CURRENT_PERIOD,
      },
      body.exceptPenaltyId
    );
    return {
      amount,
      plan,
      capPercent,
      overBreachAction,
      gross: ctx.gross,
      dayRate: ctx.dayRate,
      monthlyBasic: ctx.monthlyBasic,
      cap: Math.round((ctx.gross * capPercent) / 100),
    };
  });
}
