import { MockApiError, mockResponse } from "@/lib/mock-api";
import { appendActivity, CONFIG_FILES, readJson, validateStructure } from "@/lib/payroll/config-server";
import { collection, insertItem } from "@/lib/payroll/store";
import type { PayrollComponent, SalaryStructure } from "@/lib/payroll/types";

// Filters: ?profileId=pf-gov  ?active=true|false
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const profileId = params.get("profileId");
    const active = params.get("active");
    const items = await collection<SalaryStructure>(CONFIG_FILES.structures);
    return items
      .filter((s) => (!profileId || s.profileId === profileId) && (!active || s.isActive === (active === "true")))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  });
}

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      const input = await readJson<Partial<SalaryStructure>>(request);
      const [items, components] = await Promise.all([
        collection<SalaryStructure>(CONFIG_FILES.structures),
        collection<PayrollComponent>(CONFIG_FILES.components),
      ]);
      validateStructure(input, items, components);

      const now = new Date().toISOString();
      const created: SalaryStructure = {
        id: `st-${Date.now().toString(36)}`,
        code: input.code!.trim().toUpperCase(),
        name: input.name!,
        profileId: input.profileId!,
        effectiveFrom: input.effectiveFrom!,
        effectiveTo: input.effectiveTo ?? null,
        isActive: input.isActive ?? true,
        lines: (input.lines ?? []).map((l, i) => ({ ...l, id: l.id || `sl-${Date.now().toString(36)}-${i}` })),
        createdAt: now,
        updatedAt: now,
      };
      if (!created.profileId) throw new MockApiError(422, "profileId is required");
      await insertItem(CONFIG_FILES.structures, created);
      await appendActivity(request, {
        entityType: "structure",
        entityId: created.id,
        action: "Created",
        summary: { ar: `إنشاء الهيكل ${created.code}`, en: `Structure ${created.code} created` },
      });
      return created;
    },
    { status: 201 }
  );
}
