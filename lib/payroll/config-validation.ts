import type {
  AttendancePenaltyPolicy,
  FieldErrors,
  GovtGradeStep,
  PayrollComponent,
  PayrollProfile,
  TaxBracket,
} from "@/lib/payroll/types";

// Pure validation for the configuration module (docs/spec-payroll-config.md §4). Shared by the
// Route Handlers (authoritative, answer HTTP 422) and the forms (inline errors), so a rule lives once.
// Rule ids (C-1…C-13) are carried on every error so screens and the WORKLOG can reference them.

const err = (rule: string, ar: string, en: string) => ({ rule, message: { ar, en } });

const NO_BASE_REDUCE = new Set(["AbsenceDeduction", "LatenessDeduction"]);

/** C-1 (unique code), C-2 (percent needs value + bases), C-3 (reducesGross only for absence/lateness). */
export function validateComponent(
  input: Partial<PayrollComponent>,
  existing: PayrollComponent[],
  selfId?: string
): FieldErrors {
  const errors: FieldErrors = {};
  const code = input.code?.trim() ?? "";
  if (!code) {
    errors.code = err("C-1", "الكود مطلوب", "Code is required");
  } else if (existing.some((c) => c.id !== selfId && c.code.toLowerCase() === code.toLowerCase())) {
    errors.code = err("C-1", "هذا الكود مستخدم لبند آخر", "This code is already used by another component");
  }
  if (!input.name?.ar?.trim() || !input.name?.en?.trim()) {
    errors.name = err("C-1", "الاسم بالعربي والإنكليزي مطلوب", "Arabic and English names are required");
  }
  if (!input.componentType) errors.componentType = err("C-1", "النوع مطلوب", "Type is required");
  if (!input.category) errors.category = err("C-1", "الفئة مطلوبة", "Category is required");
  if (!input.calculationMethod) {
    errors.calculationMethod = err("C-1", "طريقة الاحتساب مطلوبة", "Calculation method is required");
  }
  if (input.calculationMethod === "PercentOfBase") {
    if (input.percentValue == null || !(input.percentValue > 0) || input.percentValue > 100) {
      errors.percentValue = err("C-2", "النسبة مطلوبة (بين 0 و100)", "Percent is required (between 0 and 100)");
    }
    if (!input.baseComponentCodes?.length) {
      errors.baseComponentCodes = err("C-2", "حدّد بنداً واحداً على الأقل كوعاء للنسبة", "Pick at least one base component for the percentage");
    }
  }
  if (input.reducesGross && !NO_BASE_REDUCE.has(input.category ?? "")) {
    errors.reducesGross = err("C-3", "«يخفّض الإجمالي» لخصم الغياب والتأخير فقط", "“Reduces gross” applies to absence and lateness deductions only");
  }
  if (!input.reducesGross && NO_BASE_REDUCE.has(input.category ?? "")) {
    errors.reducesGross = err("C-3", "خصم الغياب والتأخير يجب أن يخفّض الإجمالي", "Absence and lateness deductions must reduce gross");
  }
  return errors;
}

/** C-8: tiers contiguous (next starts right after the previous ends), non-overlapping, last one open-ended. */
export function validateLatenessTiers(tiers: AttendancePenaltyPolicy["latenessTiers"]): FieldErrors {
  const errors: FieldErrors = {};
  if (tiers.length === 0) {
    errors.latenessTiers = err("C-8", "أضف شريحة تأخير واحدة على الأقل", "Add at least one lateness tier");
    return errors;
  }
  const sorted = [...tiers].sort((a, b) => a.fromMinutes - b.fromMinutes);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t.fromMinutes < 1 || (t.toMinutes != null && t.toMinutes < t.fromMinutes)) {
      errors.latenessTiers = err("C-8", "حدود الشريحة غير صحيحة", "Tier bounds are invalid");
      return errors;
    }
    if (!(t.dayFraction > 0 && t.dayFraction <= 1)) {
      errors.latenessTiers = err("C-8", "نسبة اليوم بين 0 و1", "Day fraction must be between 0 and 1");
      return errors;
    }
    const next = sorted[i + 1];
    if (next) {
      if (t.toMinutes == null || next.fromMinutes !== t.toMinutes + 1) {
        errors.latenessTiers = err("C-8", "الشرائح يجب أن تكون متصلة وغير متداخلة", "Tiers must be contiguous and non-overlapping");
        return errors;
      }
    } else if (t.toMinutes != null) {
      errors.latenessTiers = err("C-8", "آخر شريحة يجب أن تكون مفتوحة (بلا حدّ أعلى)", "The last tier must be open-ended");
      return errors;
    }
  }
  return errors;
}

/** C-4 (private overtime ≥ 1.5), C-6 (rounding), C-7 (cap %), C-8 (grace + tiers), C-13 (monthly only). */
export function validateProfile(input: PayrollProfile): FieldErrors {
  const errors: FieldErrors = {};
  if (input.code === "PRIVATE_IQ" && input.overtimeMultiplierNormal < 1.5) {
    errors.overtimeMultiplierNormal = err("C-4", "مضاعف الإضافي العادي للقطاع الخاص لا يقل عن 1.5 (قانون العمل 37/2015)", "Private-sector normal overtime multiplier must be at least 1.5 (Labour Law 37/2015)");
  }
  if (![1, 250, 500, 1000].includes(input.roundingRule)) {
    errors.roundingRule = err("C-6", "التقريب: 1 أو 250 أو 500 أو 1000", "Rounding must be 1, 250, 500 or 1000");
  }
  const policy = input.attendancePenaltyPolicy;
  const cap = policy.maxMonthlyDeductionPercent;
  if (!(cap >= 1 && cap <= 100)) {
    errors.maxMonthlyDeductionPercent = err("C-7", "سقف الاستقطاع بين 1 و100%", "Deduction cap must be between 1 and 100%");
  }
  if (!(policy.graceMinutes >= 0)) {
    errors.graceMinutes = err("C-8", "فترة السماح 0 دقيقة أو أكثر", "Grace period must be 0 minutes or more");
  }
  if (policy.latenessMethod === "Tiers") Object.assign(errors, validateLatenessTiers(policy.latenessTiers));
  if (policy.latenessMethod === "PerMinute" && !((policy.latenessRatePerMinute ?? 0) > 0)) {
    errors.latenessRatePerMinute = err("C-8", "معدّل الدقيقة مطلوب", "Per-minute rate is required");
  }
  if (policy.latenessMethod === "CountBased" && !((policy.maxLateEventsBeforeDayCut ?? 0) > 0)) {
    errors.maxLateEventsBeforeDayCut = err("C-8", "عدد مرات التأخير مطلوب", "Late-event count is required");
  }
  if (input.payFrequency !== "Monthly") {
    errors.payFrequency = err("C-13", "الدورات الأسبوعية واليومية قيد التطوير", "Weekly and daily cycles are under development");
  }
  if (input.cutoffDay < 1 || input.cutoffDay > 31) {
    errors.cutoffDay = err("C-8", "يوم القطع بين 1 و31", "Cut-off day must be between 1 and 31");
  }
  return errors;
}

/** C-10: first bracket starts at 0, no gaps / overlaps, last bracket open-ended, rates 0–100. */
export function validateBrackets(brackets: TaxBracket[]): FieldErrors {
  const errors: FieldErrors = {};
  if (brackets.length === 0) {
    errors.brackets = err("C-10", "أضف شريحة واحدة على الأقل", "Add at least one bracket");
    return errors;
  }
  const sorted = [...brackets].sort((a, b) => a.fromAmount - b.fromAmount);
  if (sorted[0].fromAmount !== 0) {
    errors.brackets = err("C-10", "أول شريحة يجب أن تبدأ من 0", "The first bracket must start at 0");
    return errors;
  }
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.rate < 0 || b.rate > 100) {
      errors.brackets = err("C-10", "النسبة بين 0 و100", "Rate must be between 0 and 100");
      return errors;
    }
    const next = sorted[i + 1];
    if (next) {
      if (b.toAmount == null || b.toAmount <= b.fromAmount || next.fromAmount !== b.toAmount) {
        errors.brackets = err("C-10", "الشرائح يجب أن تكون متصلة بلا فجوات أو تداخل", "Brackets must be contiguous with no gaps or overlaps");
        return errors;
      }
    } else if (b.toAmount != null) {
      errors.brackets = err("C-10", "آخر شريحة يجب أن تكون مفتوحة (بلا حدّ أعلى)", "The last bracket must be open-ended");
      return errors;
    }
  }
  return errors;
}

/** C-11: one cell per (grade, step), nominal strictly increasing by step within a grade. */
export function validateGradeSteps(steps: GovtGradeStep[]): FieldErrors {
  const errors: FieldErrors = {};
  const seen = new Set<string>();
  const byGrade = new Map<number, GovtGradeStep[]>();
  for (const s of steps) {
    const key = `${s.grade}/${s.step}`;
    if (seen.has(key)) {
      errors[key] = err("C-11", `الخلية ${key} مكرّرة`, `Cell ${key} is duplicated`);
    }
    seen.add(key);
    if (!(s.nominalSalary > 0)) errors[key] = err("C-11", `الاسمي في ${key} يجب أن يكون موجباً`, `Nominal at ${key} must be positive`);
    byGrade.set(s.grade, [...(byGrade.get(s.grade) ?? []), s]);
  }
  for (const [grade, list] of byGrade) {
    const sorted = [...list].sort((a, b) => a.step - b.step);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].nominalSalary <= sorted[i - 1].nominalSalary) {
        errors[`${grade}/${sorted[i].step}`] = err("C-11", `الاسمي يجب أن يتصاعد مع المرحلة (الدرجة ${grade})`, `Nominal must rise with each step (grade ${grade})`);
      }
    }
  }
  return errors;
}

/** C-9: a new effective-dated record must start after the latest existing record of the same profile. */
export function validateEffectiveFrom(
  effectiveFrom: string,
  existing: { effectiveFrom: string }[]
): FieldErrors {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { effectiveFrom: err("C-9", "تاريخ السريان مطلوب", "Effective-from date is required") };
  }
  const latest = existing.map((e) => e.effectiveFrom).sort().at(-1);
  if (latest && effectiveFrom <= latest) {
    return {
      effectiveFrom: err("C-9", `يجب أن يكون تاريخ السريان بعد ${latest} (آخر سجل)`, `Effective-from must be after ${latest} (latest record)`),
    };
  }
  return {};
}

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

/** Derived status of an effective-dated record (spec §3). */
export function effectiveStatus(
  record: { effectiveFrom: string; effectiveTo: string | null },
  today: string = new Date().toISOString().slice(0, 10)
): "Upcoming" | "Current" | "Expired" {
  if (record.effectiveFrom > today) return "Upcoming";
  if (record.effectiveTo && record.effectiveTo < today) return "Expired";
  return "Current";
}

/** Day before an ISO date (auto-close of the superseded record, C-9). */
export function dayBefore(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
