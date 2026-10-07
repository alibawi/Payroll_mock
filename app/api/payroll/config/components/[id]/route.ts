import { MockApiError, mockResponse } from "@/lib/mock-api";
import {
  appendActivity,
  assertValid,
  CONFIG_FILES,
  diffFields,
  readJson,
} from "@/lib/payroll/config-server";
import { validateComponent } from "@/lib/payroll/config-validation";
import { collection, updateItem } from "@/lib/payroll/store";
import type { PayrollComponent, SalaryStructure } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

const TRACKED: (keyof PayrollComponent)[] = [
  "code", "name", "componentType", "category", "calculationMethod", "percentValue", "baseComponentCodes",
  "isTaxable", "isPensionable", "isSocialSecurityBase", "isProratable", "reducesGross",
  "expenseAccountCode", "payableAccountCode", "sequence", "isActive",
];

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const item = (await collection<PayrollComponent>(CONFIG_FILES.components)).find((c) => c.id === id);
    if (!item) throw new MockApiError(404, `Component ${id} not found`);
    const structures = await collection<SalaryStructure>(CONFIG_FILES.structures);
    const usedInStructures = structures
      .filter((s) => s.lines.some((l) => l.componentId === id))
      .map((s) => ({ id: s.id, code: s.code, name: s.name, profileId: s.profileId, isActive: s.isActive }));
    return { ...item, usedInStructures };
  });
}

// Partial update. `isActive` toggles enable/disable (C-12: no hard delete, only deactivation).
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const items = await collection<PayrollComponent>(CONFIG_FILES.components);
    const before = items.find((c) => c.id === id);
    if (!before) throw new MockApiError(404, `Component ${id} not found`);

    const patch = await readJson<Partial<PayrollComponent>>(request);
    const merged = { ...before, ...patch, id };
    // A percentage only makes sense for PercentOfBase; base codes stay (overtime uses them for its hourly rate).
    if (merged.calculationMethod !== "PercentOfBase") merged.percentValue = null;
    assertValid(validateComponent(merged, items, id));

    const after = (await updateItem<PayrollComponent>(CONFIG_FILES.components, id, {
      ...merged,
      code: merged.code.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    }))!;

    const changes = diffFields(before, after, TRACKED);
    const toggledOnly = changes.length === 1 && changes[0].field === "isActive";
    if (changes.length > 0) {
      await appendActivity(request, {
        entityType: "component",
        entityId: id,
        action: toggledOnly ? (after.isActive ? "Activated" : "Deactivated") : "Updated",
        summary: toggledOnly
          ? after.isActive
            ? { ar: "تفعيل البند", en: "Component activated" }
            : { ar: "تعطيل البند", en: "Component deactivated" }
          : { ar: `تعديل البند (${changes.length} حقل)`, en: `Component updated (${changes.length} field(s))` },
        changes,
      });
    }
    return after;
  });
}

// C-12: used or not, components are never hard-deleted — deactivate instead.
export async function DELETE(request: Request) {
  return mockResponse(request, () => {
    throw new MockApiError(409, "Components cannot be deleted — deactivate them instead (C-12)");
  });
}
