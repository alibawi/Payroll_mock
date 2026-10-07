import { assertValid, readJson } from "@/lib/payroll/config-server";
import { fail } from "@/lib/payroll/run-server";
import { mockResponse } from "@/lib/mock-api";
import { validateEosDraft, type EosDraft } from "@/lib/payroll/eos";
import { eosContext, eosFor } from "@/lib/payroll/eos-context";
import { appendEosActivity, findEos, loadEosData, requireEosPermission } from "@/lib/payroll/eos-server";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { collection, updateItem } from "@/lib/payroll/store";
import type { EndOfServiceCalculation, EosActivity } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requireEosPermission(request, "view");
    const [eos, data, activity] = await Promise.all([findEos(id), loadEosData(), collection<EosActivity>(REPORT_FILES.eosActivity)]);
    return {
      eos,
      employee: data.employees.find((e) => e.id === eos.employeeId) ?? null,
      activity: activity.filter((a) => a.eosId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    };
  });
}

// PATCH — edit a Draft claim; the amounts are recalculated.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requireEosPermission(request, "update");
    const eos = await findEos(id);
    if (eos.status !== "Draft") throw fail(409, "Only a draft claim can be edited", "T-STATE", "يمكن تعديل المسودة فقط", "Only a draft claim can be edited");
    const body = await readJson<Partial<EosDraft>>(request);
    const merged = { ...eos, ...body };
    const [claims, data] = await Promise.all([collection<EndOfServiceCalculation>(REPORT_FILES.eos), loadEosData()]);
    assertValid(validateEosDraft({ ...merged, notes: merged.notes ?? undefined }, claims, id));
    const ctx = eosContext(data, merged.employeeId, merged.terminationDate)!;
    const r = eosFor(ctx, merged.terminationReason, merged.accruedLeaveDays, merged.arbitraryDismissalCompensation);
    const updated = await updateItem<EndOfServiceCalculation>(REPORT_FILES.eos, id, {
      employeeId: merged.employeeId,
      terminationDate: merged.terminationDate,
      terminationReason: merged.terminationReason,
      accruedLeaveDays: merged.accruedLeaveDays,
      serviceYears: ctx.serviceYears,
      lastWage: ctx.lastWage,
      gratuityAmount: r.gratuityAmount,
      accruedLeavePay: r.accruedLeavePay,
      arbitraryDismissalCompensation: r.arbitraryDismissalCompensation,
      totalAmount: r.totalAmount,
      notes: body.notes ?? eos.notes,
      updatedAt: new Date().toISOString(),
    });
    await appendEosActivity(request, id, "Updated", { ar: "تعديل المطالبة", en: "Claim updated" });
    return updated;
  });
}
