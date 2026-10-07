import { CURRENT_PERIOD } from "@/lib/payroll/periods";
import type { FieldErrors, PenaltyStatus, PenaltyType } from "@/lib/payroll/types";

const err = (rule: string, ar: string, en: string) => ({ rule, message: { ar, en } });

export type PenaltyDraft = {
  employeeId: string;
  penaltyType: PenaltyType;
  value: number | null;
  reason: string;
  decisionRef: string;
  decisionDate: string;
  spreadOverMonths: number;
  startPeriodId: string;
};

/** Field validation of a penalty request: P-10 (reason + decision are mandatory) and the value rules of each type. */
export function validatePenaltyDraft(input: Partial<PenaltyDraft>): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.employeeId) errors.employeeId = err("P-12", "الموظف مطلوب", "Employee is required");
  if (!input.penaltyType) errors.penaltyType = err("P-1", "نوع العقوبة مطلوب", "Penalty type is required");

  const value = Number(input.value);
  if (input.penaltyType === "FixedAmount" && !(value > 0)) errors.value = err("P-1", "المبلغ يجب أن يكون موجباً", "Amount must be positive");
  if (input.penaltyType === "DaysOfPay" && !(value > 0 && value <= 30)) errors.value = err("P-1", "عدد الأيام بين 1 و30", "Days must be between 1 and 30");
  if (input.penaltyType === "PercentOfSalary" && !(value > 0 && value <= 100)) errors.value = err("P-1", "النسبة بين 0 و100", "Percentage must be between 0 and 100");

  if (!input.reason?.trim()) errors.reason = err("P-10", "السبب إلزامي", "Reason is mandatory");
  if (!input.decisionRef?.trim()) errors.decisionRef = err("P-10", "رقم القرار إلزامي", "Decision reference is mandatory");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.decisionDate ?? "")) errors.decisionDate = err("P-10", "تاريخ القرار إلزامي", "Decision date is mandatory");

  const months = Number(input.spreadOverMonths);
  if (!Number.isInteger(months) || months < 1 || months > 60) errors.spreadOverMonths = err("P-4", "عدد الأشهر بين 1 و60", "Months must be between 1 and 60");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startPeriodId ?? "")) errors.startPeriodId = err("P-3", "فترة أول استقطاع مطلوبة", "Start period is required");
  else if (input.startPeriodId! < CURRENT_PERIOD) errors.startPeriodId = err("P-3", "أول استقطاع لا يسبق الفترة المفتوحة", "Start period cannot precede the open period");
  return errors;
}

/** Action buttons per status (spec §3). */
export const PENALTY_ACTIONS: Record<PenaltyStatus, string[]> = {
  Draft: ["edit", "approve", "cancel"],
  Approved: ["cancel"],
  Applying: [],
  Applied: [],
  Cancelled: [],
};
