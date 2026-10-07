import type {
  CompensationStatus,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  FieldErrors,
  PayrollComponent,
  PayrollProfile,
  SalaryStructure,
  TaxMaritalStatus,
} from "@/lib/payroll/types";

// Pure validation + status helpers for module 2 (docs/spec-payroll-compensation.md §3–4), shared by the
// Route Handlers (authoritative, HTTP 422) and the assign form (inline errors).

const err = (rule: string, ar: string, en: string) => ({ rule, message: { ar, en } });

export type CompensationDraft = Pick<
  EmployeeCompensation,
  | "profileId"
  | "salaryStructureId"
  | "effectiveFrom"
  | "paymentMethod"
  | "bankAccountNo"
  | "gradeStepId"
  | "baseSalary"
  | "taxMaritalStatus"
  | "eligibleChildrenCount"
> & { overrides: Pick<EmployeeCompensationComponent, "componentId" | "amount" | "percent">[] };

export type CompensationContext = {
  profile: PayrollProfile | undefined;
  structure: SalaryStructure | undefined;
  components: PayrollComponent[];
  /** The employee's existing records (all of them). */
  employeeRecords: Pick<EmployeeCompensation, "effectiveFrom" | "effectiveTo">[];
  validGradeStepIds: Set<string>;
  minimumWage: number;
};

const MARITAL: TaxMaritalStatus[] = ["Single", "Married", "Divorced", "Widowed"];

export function validateCompensation(input: CompensationDraft, ctx: CompensationContext): FieldErrors {
  const errors: FieldErrors = {};
  const { profile, structure } = ctx;

  if (!profile) errors.profileId = err("E-2", "الملف مطلوب", "Profile is required");
  if (!structure) errors.salaryStructureId = err("E-2", "هيكل الراتب مطلوب", "Salary structure is required");
  else if (profile && structure.profileId !== profile.id) {
    errors.salaryStructureId = err("E-6", "الهيكل لا يتبع الملف المختار", "The structure does not belong to the selected profile");
  } else if (input.effectiveFrom && (input.effectiveFrom < structure.effectiveFrom || (structure.effectiveTo && input.effectiveFrom > structure.effectiveTo))) {
    errors.salaryStructureId = err("E-6", "الهيكل غير نافذ بتاريخ السريان", "The structure is not effective on this date");
  }

  // E-1: a single record is current at any date → the new one must start after the latest existing one.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom ?? "")) {
    errors.effectiveFrom = err("E-1", "تاريخ السريان مطلوب", "Effective-from date is required");
  } else {
    const latest = ctx.employeeRecords.map((r) => r.effectiveFrom).sort().at(-1);
    if (latest && input.effectiveFrom <= latest) {
      errors.effectiveFrom = err("E-1", `يجب أن يكون تاريخ السريان بعد ${latest} (آخر سجل)`, `Effective-from must be after ${latest} (latest record)`);
    }
  }

  // E-2: government = grade/step only; private = base salary only.
  if (profile) {
    const government = profile.code === "GOVERNMENT_IQ";
    if (government) {
      if (!input.gradeStepId) errors.gradeStepId = err("E-2", "الدرجة والمرحلة إلزاميتان للحكومي", "Grade and step are required for government staff");
      else if (!ctx.validGradeStepIds.has(input.gradeStepId)) errors.gradeStepId = err("E-2", "خلية السلّم غير موجودة", "Grade-scale cell not found");
      if (input.baseSalary != null) errors.baseSalary = err("E-2", "الأجر الأساسي ممنوع للحكومي (يُشتق من السلّم)", "Base salary is not allowed for government staff (derived from the scale)");
    } else {
      if (input.baseSalary == null) errors.baseSalary = err("E-2", "الأجر الأساسي إلزامي للقطاع الخاص", "Base salary is required for private-sector staff");
      else if (input.baseSalary < ctx.minimumWage) {
        errors.baseSalary = err("E-3", `الأجر أقل من الحد الأدنى (${ctx.minimumWage.toLocaleString("en-US")} د.ع)`, `Wage is below the minimum (${ctx.minimumWage.toLocaleString("en-US")} IQD)`);
      }
      if (input.gradeStepId) errors.gradeStepId = err("E-2", "الدرجة/المرحلة ممنوعة للقطاع الخاص", "Grade/step is not allowed for private-sector staff");
    }
  }

  // E-4
  if (input.paymentMethod === "Bank" && !input.bankAccountNo?.trim()) {
    errors.bankAccountNo = err("E-4", "رقم الحساب المصرفي مطلوب للدفع المصرفي", "Bank account number is required for bank payment");
  }

  // E-5: an override must target a component of the structure or an active allowance.
  const inStructure = new Set(structure?.lines.map((l) => l.componentId));
  for (const o of input.overrides) {
    const component = ctx.components.find((c) => c.id === o.componentId);
    const allowed = inStructure.has(o.componentId) || (component?.isActive && component.category === "Allowance");
    if (!component || !allowed) {
      errors.overrides = err("E-5", "تجاوز لبند ليس ضمن الهيكل ولا بدلاً نشطاً", "Override targets a component outside the structure that is not an active allowance");
      break;
    }
    if ((o.amount ?? 0) < 0 || (o.percent != null && (o.percent < 0 || o.percent > 100))) {
      errors.overrides = err("E-5", "قيمة التجاوز غير صالحة", "Invalid override value");
      break;
    }
  }

  // E-7
  if (!Number.isInteger(input.eligibleChildrenCount) || input.eligibleChildrenCount < 0) {
    errors.eligibleChildrenCount = err("E-7", "عدد الأطفال عدد صحيح ≥ 0", "Children must be a whole number ≥ 0");
  }
  if (!MARITAL.includes(input.taxMaritalStatus)) {
    errors.taxMaritalStatus = err("E-7", "الحالة الاجتماعية غير صالحة", "Invalid marital status");
  }
  return errors;
}

/** Upcoming (starts in the future) · Current · Superseded (ended in the past) — spec §3. */
export function compensationStatus(
  record: { effectiveFrom: string; effectiveTo: string | null },
  today: string = new Date().toISOString().slice(0, 10)
): CompensationStatus {
  if (record.effectiveFrom > today) return "Upcoming";
  if (record.effectiveTo && record.effectiveTo < today) return "Superseded";
  return "Current";
}

/** Whole years between two ISO dates (service length). */
export function yearsBetween(from: string, to: string = new Date().toISOString().slice(0, 10)): number {
  const a = new Date(from);
  const b = new Date(to);
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) years--;
  return Math.max(0, years);
}
