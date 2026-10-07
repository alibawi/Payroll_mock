import { mockResponse } from "@/lib/mock-api";
import { appendActivity, assertValid, CONFIG_FILES, readJson } from "@/lib/payroll/config-server";
import { validateComponent } from "@/lib/payroll/config-validation";
import { collection, insertItem } from "@/lib/payroll/store";
import type { PayrollComponent } from "@/lib/payroll/types";

// Filters: ?type=Earning  ?category=Allowance  ?method=FixedAmount  ?active=true|false  ?q=<text>
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const category = params.get("category");
    const method = params.get("method");
    const active = params.get("active");
    const q = params.get("q")?.trim().toLowerCase();

    const items = await collection<PayrollComponent>(CONFIG_FILES.components);
    return items
      .filter(
        (c) =>
          (!type || c.componentType === type) &&
          (!category || c.category === category) &&
          (!method || c.calculationMethod === method) &&
          (!active || c.isActive === (active === "true")) &&
          (!q || [c.code, c.name.ar, c.name.en].some((v) => v.toLowerCase().includes(q)))
      )
      .sort((a, b) => a.sequence - b.sequence);
  });
}

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      const input = await readJson<Partial<PayrollComponent>>(request);
      const items = await collection<PayrollComponent>(CONFIG_FILES.components);
      assertValid(validateComponent(input, items));

      const now = new Date().toISOString();
      const isPercent = input.calculationMethod === "PercentOfBase";
      const created: PayrollComponent = {
        id: `pc-${String(items.length + 1).padStart(2, "0")}-${Date.now().toString(36)}`,
        code: input.code!.trim().toUpperCase(),
        name: input.name!,
        componentType: input.componentType!,
        category: input.category!,
        calculationMethod: input.calculationMethod!,
        percentValue: isPercent ? (input.percentValue ?? null) : null,
        baseComponentCodes: input.baseComponentCodes ?? [],
        isTaxable: !!input.isTaxable,
        isPensionable: !!input.isPensionable,
        isSocialSecurityBase: !!input.isSocialSecurityBase,
        isProratable: !!input.isProratable,
        reducesGross: !!input.reducesGross,
        expenseAccountCode: input.expenseAccountCode ?? null,
        payableAccountCode: input.payableAccountCode ?? null,
        sequence: input.sequence ?? Math.max(0, ...items.map((c) => c.sequence)) + 10,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      await insertItem(CONFIG_FILES.components, created);
      await appendActivity(request, {
        entityType: "component",
        entityId: created.id,
        action: "Created",
        summary: { ar: `إنشاء البند ${created.code}`, en: `Component ${created.code} created` },
      });
      return created;
    },
    { status: 201 }
  );
}
