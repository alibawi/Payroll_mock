import { MockApiError, mockResponse } from "@/lib/mock-api";
import { appendActivity, CONFIG_FILES, diffFields, readJson, validateStructure } from "@/lib/payroll/config-server";
import { collection, updateItem } from "@/lib/payroll/store";
import type { PayrollComponent, SalaryStructure } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const item = (await collection<SalaryStructure>(CONFIG_FILES.structures)).find((s) => s.id === id);
    if (!item) throw new MockApiError(404, `Structure ${id} not found`);
    return item;
  });
}

// Replaces name / dates / active flag / lines. Structures are never deleted (C-12) — deactivate.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const [items, components] = await Promise.all([
      collection<SalaryStructure>(CONFIG_FILES.structures),
      collection<PayrollComponent>(CONFIG_FILES.components),
    ]);
    const before = items.find((s) => s.id === id);
    if (!before) throw new MockApiError(404, `Structure ${id} not found`);

    const patch = await readJson<Partial<SalaryStructure>>(request);
    const merged: SalaryStructure = { ...before, ...patch, id, profileId: before.profileId };
    validateStructure(merged, items, components, id);

    const after = (await updateItem<SalaryStructure>(CONFIG_FILES.structures, id, {
      ...merged,
      code: merged.code.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    }))!;

    const changes = diffFields(before, after, ["code", "name", "effectiveFrom", "effectiveTo", "isActive"]);
    const lineDelta = after.lines.length - before.lines.length;
    if (JSON.stringify(before.lines) !== JSON.stringify(after.lines)) {
      changes.push({
        field: "lines",
        from: String(before.lines.length),
        to: `${after.lines.length}${lineDelta === 0 ? " (modified)" : ""}`,
      });
    }
    if (changes.length > 0) {
      const toggledOnly = changes.length === 1 && changes[0].field === "isActive";
      await appendActivity(request, {
        entityType: "structure",
        entityId: id,
        action: toggledOnly ? (after.isActive ? "Activated" : "Deactivated") : "Updated",
        summary: toggledOnly
          ? after.isActive
            ? { ar: "تفعيل الهيكل", en: "Structure activated" }
            : { ar: "تعطيل الهيكل", en: "Structure deactivated" }
          : { ar: `تعديل الهيكل ${after.code}`, en: `Structure ${after.code} updated` },
        changes,
      });
    }
    return after;
  });
}
