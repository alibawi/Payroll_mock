import { roundTo } from "@/lib/payroll/preview";
import type { EndOfServiceCalculation, FieldErrors, TerminationReason } from "@/lib/payroll/types";

// End-of-service calculation of a private-sector employee (study 5.7, spec-payroll-reports §4 T-4…T-10).
// Illustrative mock formula (T-7): weekly wage = last wage × 7 ÷ 30; gratuity = two weeks' wage per year of service
// (fractions pro rata). No gratuity for a disciplinary dismissal (T-6). Government staff are covered by the pension (T-8).

export type EosInput = {
  serviceYears: number;
  lastWage: number;
  terminationReason: TerminationReason;
  accruedLeaveDays: number;
  arbitraryDismissalCompensation: number;
  /** Working days per month behind the day rate (profile `dayRateBasis`: 26 or 30). */
  dayRateDivisor: number;
  roundingRule: number;
};

export type EosResult = {
  weeklyWage: number;
  dayRate: number;
  gratuityAmount: number;
  accruedLeavePay: number;
  arbitraryDismissalCompensation: number;
  totalAmount: number;
};

/** Whole years plus the fraction, to two decimals: 2021-01-01 → 2026-08-31 = 5.67. */
export function serviceYearsBetween(joiningDate: string, terminationDate: string): number {
  const days = (Date.parse(`${terminationDate}T00:00:00Z`) - Date.parse(`${joiningDate}T00:00:00Z`)) / 86_400_000 + 1;
  return Math.max(0, Math.round((days / 365.25) * 100) / 100);
}

export function computeEos(input: EosInput): EosResult {
  const weeklyWage = (input.lastWage * 7) / 30;
  const gratuity = input.terminationReason === "DismissalDisciplinary" ? 0 : roundTo(weeklyWage * 2 * input.serviceYears, input.roundingRule);
  const dayRate = input.dayRateDivisor > 0 ? Math.round(input.lastWage / input.dayRateDivisor) : 0;
  const leavePay = roundTo(dayRate * Math.max(0, input.accruedLeaveDays), input.roundingRule);
  const compensation = input.terminationReason === "Termination" ? Math.max(0, input.arbitraryDismissalCompensation) : 0;
  return {
    weeklyWage: Math.round(weeklyWage),
    dayRate,
    gratuityAmount: gratuity,
    accruedLeavePay: leavePay,
    arbitraryDismissalCompensation: compensation,
    totalAmount: gratuity + leavePay + compensation,
  };
}

/** Status transitions of an end-of-service claim (G4). */
export const EOS_ACTIONS: Record<EndOfServiceCalculation["status"], ("edit" | "approve" | "pay" | "cancel")[]> = {
  Draft: ["edit", "approve", "cancel"],
  Approved: ["pay", "cancel"],
  Paid: [],
  Cancelled: [],
};

export type EosDraft = {
  employeeId: string;
  terminationDate: string;
  terminationReason: TerminationReason;
  accruedLeaveDays: number;
  arbitraryDismissalCompensation: number;
  notes?: string;
};

export function validateEosDraft(draft: Partial<EosDraft>, existing: EndOfServiceCalculation[], selfId?: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.employeeId) errors.employeeId = { rule: "T-0", message: { ar: "الموظف مطلوب", en: "Employee is required" } };
  if (!draft.terminationDate) errors.terminationDate = { rule: "T-0", message: { ar: "تاريخ الانفكاك مطلوب", en: "Termination date is required" } };
  if (!draft.terminationReason) errors.terminationReason = { rule: "T-0", message: { ar: "سبب الانفكاك مطلوب", en: "Termination reason is required" } };
  if ((draft.accruedLeaveDays ?? 0) < 0) errors.accruedLeaveDays = { rule: "T-5", message: { ar: "رصيد الإجازات لا يكون سالباً", en: "Leave balance cannot be negative" } };
  if (draft.employeeId && draft.terminationDate) {
    const dup = existing.find((e) => e.id !== selfId && e.employeeId === draft.employeeId && e.terminationDate === draft.terminationDate && e.status !== "Cancelled");
    if (dup) {
      errors.terminationDate = { rule: "T-9", message: { ar: `توجد مطالبة لنفس الموظف وتاريخ الانفكاك (${dup.eosNo})`, en: `A claim already exists for this employee and date (${dup.eosNo})` } };
    }
  }
  return errors;
}
