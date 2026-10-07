import { MockApiError, mockResponse } from "@/lib/mock-api";
import { appendActivity, assertValid, CONFIG_FILES, readJson } from "@/lib/payroll/config-server";
import { validateGradeSteps } from "@/lib/payroll/config-validation";
import { collection, updateItem } from "@/lib/payroll/store";
import type { GovtGradeScale, GovtGradeStep } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const item = (await collection<GovtGradeScale>(CONFIG_FILES.gradeScales)).find((s) => s.id === id);
    if (!item) throw new MockApiError(404, `Grade scale ${id} not found`);
    return item;
  });
}

// Body: { steps: GovtGradeStep[] } — the full grid, validated for C-11 (unique cells, rising nominal).
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const before = (await collection<GovtGradeScale>(CONFIG_FILES.gradeScales)).find((s) => s.id === id);
    if (!before) throw new MockApiError(404, `Grade scale ${id} not found`);

    const { steps } = await readJson<{ steps: GovtGradeStep[] }>(request);
    if (!Array.isArray(steps)) throw new MockApiError(400, "steps array is required");
    assertValid(validateGradeSteps(steps));

    const oldByKey = new Map(before.steps.map((s) => [`${s.grade}/${s.step}`, s]));
    const changes = steps.flatMap((s) => {
      const old = oldByKey.get(`${s.grade}/${s.step}`);
      const list = [];
      if (old?.nominalSalary !== s.nominalSalary) {
        list.push({ field: `${s.grade}/${s.step}.nominalSalary`, from: String(old?.nominalSalary ?? "—"), to: String(s.nominalSalary) });
      }
      if (old?.annualIncrementAmount !== s.annualIncrementAmount) {
        list.push({ field: `${s.grade}/${s.step}.annualIncrementAmount`, from: String(old?.annualIncrementAmount ?? "—"), to: String(s.annualIncrementAmount) });
      }
      return list;
    });

    const after = (await updateItem<GovtGradeScale>(CONFIG_FILES.gradeScales, id, {
      steps,
      updatedAt: new Date().toISOString(),
    }))!;
    if (changes.length > 0) {
      await appendActivity(request, {
        entityType: "gradeScale",
        entityId: id,
        action: "Updated",
        summary: { ar: `تعديل ${changes.length} قيمة بالسلّم الوظيفي`, en: `${changes.length} value(s) changed in the grade scale` },
        changes: changes.slice(0, 20),
      });
    }
    return after;
  });
}
