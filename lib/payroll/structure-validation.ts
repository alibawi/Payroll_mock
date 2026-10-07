import type { FieldErrors, PayrollComponent, SalaryStructure } from "@/lib/payroll/types";

const err = (rule: string, ar: string, en: string) => ({ rule, message: { ar, en } });

/** Field-level validation for a salary structure (C-1 unique code, line integrity, dates). */
export function structureErrors(
  input: Partial<SalaryStructure>,
  existing: SalaryStructure[],
  components: PayrollComponent[],
  selfId?: string
): FieldErrors {
  const errors: FieldErrors = {};
  const code = input.code?.trim() ?? "";
  if (!code) errors.code = err("C-1", "الكود مطلوب", "Code is required");
  else if (existing.some((s) => s.id !== selfId && s.code.toLowerCase() === code.toLowerCase())) {
    errors.code = err("C-1", "هذا الكود مستخدم لهيكل آخر", "This code is already used by another structure");
  }
  if (!input.name?.ar?.trim() || !input.name?.en?.trim()) {
    errors.name = err("C-1", "الاسم بالعربي والإنكليزي مطلوب", "Arabic and English names are required");
  }
  if (!input.profileId) errors.profileId = err("C-1", "الملف مطلوب", "Profile is required");
  if (!input.effectiveFrom) errors.effectiveFrom = err("C-9", "تاريخ السريان مطلوب", "Effective-from date is required");
  else if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    errors.effectiveTo = err("C-9", "تاريخ الانتهاء قبل تاريخ البدء", "End date is before the start date");
  }
  const seen = new Set<string>();
  for (const line of input.lines ?? []) {
    if (!components.some((c) => c.id === line.componentId)) {
      errors.lines = err("C-1", "سطر يشير إلى بند غير موجود", "A line references an unknown component");
      break;
    }
    if (seen.has(line.componentId)) {
      errors.lines = err("C-1", "البند مكرّر داخل الهيكل", "A component appears twice in the structure");
      break;
    }
    seen.add(line.componentId);
    if (line.overridePercent != null && (line.overridePercent < 0 || line.overridePercent > 100)) {
      errors.lines = err("C-2", "نسبة التجاوز بين 0 و100", "Override percent must be between 0 and 100");
      break;
    }
    if (line.overrideAmount != null && line.overrideAmount < 0) {
      errors.lines = err("C-2", "مبلغ التجاوز لا يكون سالباً", "Override amount cannot be negative");
      break;
    }
  }
  return errors;
}
