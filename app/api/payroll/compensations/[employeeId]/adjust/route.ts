import { MockApiError, mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES, readJson } from "@/lib/payroll/config-server";
import { createCompensation, loadBundle, recordsOf } from "@/lib/payroll/compensation-server";
import { collection } from "@/lib/payroll/store";
import type { GovtGradeScale } from "@/lib/payroll/types";

type Params = { params: Promise<{ employeeId: string }> };

type AdjustBody = {
  kind: "increment" | "promotion";
  effectiveFrom: string;
  reason?: string;
  /** Promotion only: the target grade (1 is the highest) and optionally the step (defaults to 1). */
  targetGrade?: number;
  targetStep?: number;
};

/**
 * Government helper tools that create a new compensation record from the current one:
 *  - increment (E-9): grade step +1 and the grade's annual increment added to the accumulated increment line;
 *  - promotion (E-10): move to a higher grade (smaller number).
 */
export async function POST(request: Request, { params }: Params) {
  const { employeeId } = await params;
  return mockResponse(
    request,
    async () => {
      const body = await readJson<AdjustBody>(request);
      const [records, scales, bundle] = await Promise.all([
        recordsOf(employeeId),
        collection<GovtGradeScale>(CONFIG_FILES.gradeScales),
        loadBundle(),
      ]);
      const current = records.find((r) => r.status === "Current");
      if (!current) throw new MockApiError(409, "The employee has no current compensation to adjust");
      if (!current.gradeStepId) {
        throw new MockApiError(422, "Increment and promotion apply to government grade/step compensation only", {
          gradeStepId: { rule: "E-2", message: { ar: "الأداة للقطاع الحكومي (درجة/مرحلة) فقط", en: "This tool is for government (grade/step) staff only" } },
        });
      }

      const steps = scales.flatMap((s) => s.steps);
      const from = steps.find((s) => s.id === current.gradeStepId)!;
      const ruleError = (rule: string, ar: string, en: string) =>
        new MockApiError(422, "Validation failed", { gradeStepId: { rule, message: { ar, en } } });

      let target = from;
      if (body.kind === "increment") {
        const next = steps.find((s) => s.grade === from.grade && s.step === from.step + 1);
        if (!next) throw ruleError("E-9", "وصل الموظف لآخر مرحلة بالدرجة — لا علاوة", "The employee is at the last step of the grade — no increment");
        target = next;
      } else {
        const grade = Number(body.targetGrade);
        if (!(grade >= 1 && grade < from.grade)) {
          throw ruleError("E-10", `الترفيع لدرجة أعلى فقط (رقم أصغر من ${from.grade})`, `Promotion must be to a higher grade (a number below ${from.grade})`);
        }
        const found = steps.find((s) => s.grade === grade && s.step === (body.targetStep ?? 1));
        if (!found) throw ruleError("E-10", "خلية الهدف غير موجودة بالسلّم", "Target cell not found in the scale");
        target = found;
      }

      // Accumulated annual increment (the ANNUAL_INCREMENT line) grows by the grade's increment on an increment.
      const incrementComponent = bundle.components.find((c) => c.code === "ANNUAL_INCREMENT");
      const overrides = current.overrides.map((o) => ({ componentId: o.componentId, amount: o.amount, percent: o.percent }));
      if (body.kind === "increment" && incrementComponent) {
        const existing = overrides.find((o) => o.componentId === incrementComponent.id);
        if (existing) existing.amount = (existing.amount ?? 0) + from.annualIncrementAmount;
        else overrides.push({ componentId: incrementComponent.id, amount: from.annualIncrementAmount, percent: null });
      }

      const label = body.kind === "increment" ? { ar: "علاوة سنوية", en: "Annual increment" } : { ar: "ترفيع", en: "Promotion" };
      return createCompensation(
        request,
        employeeId,
        {
          profileId: current.profileId,
          salaryStructureId: current.salaryStructureId,
          effectiveFrom: body.effectiveFrom,
          paymentMethod: current.paymentMethod,
          bankAccountNo: current.bankAccountNo,
          gradeStepId: target.id,
          baseSalary: null,
          taxMaritalStatus: current.taxMaritalStatus,
          eligibleChildrenCount: current.eligibleChildrenCount,
          isPensionExempt: current.isPensionExempt,
          changeReason: body.reason?.trim() || label.en,
          overrides,
        },
        {
          action: body.kind === "increment" ? "Increment" : "Promotion",
          summary: {
            ar: `${label.ar}: الدرجة ${from.grade}/${from.step} ← ${target.grade}/${target.step}`,
            en: `${label.en}: grade ${from.grade}/${from.step} → ${target.grade}/${target.step}`,
          },
          changes: [{ field: "gradeStepId", from: from.id, to: target.id }],
        }
      );
    },
    { status: 201 }
  );
}
