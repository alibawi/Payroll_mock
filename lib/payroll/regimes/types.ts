import type { ComponentCategory } from "@/lib/payroll/types";

/**
 * What differs between the two payroll systems and cannot be reduced to configuration data (spec §4):
 * which statutory scheme applies, the order in which other deductions are taken under the monthly cap,
 * and how income tax is rounded. Rates, bases and brackets all stay in the effective-dated settings.
 */
export interface IPayrollRegimeProvider {
  id: "iraq-private" | "iraq-government";
  statutoryKind: "Pension" | "SocialSecurity";
  employeeCategory: ComponentCategory;
  /** Priority of the other deductions when the monthly cap bites (first = protected, taken first). */
  deductionOrder: ("CourtOrder" | "Manual" | "EmployeeLoan" | "DisciplinaryPenalty")[];
  roundIncomeTax(value: number, roundingRule: number): number;
}
