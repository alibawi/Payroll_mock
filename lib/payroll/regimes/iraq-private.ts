import type { IPayrollRegimeProvider } from "@/lib/payroll/regimes/types";

/** Private sector: social security (Law 18/2023); tax rounded to the profile's rounding rule. */
export const iraqPrivate: IPayrollRegimeProvider = {
  id: "iraq-private",
  statutoryKind: "SocialSecurity",
  employeeCategory: "StatutorySocialSecurity",
  deductionOrder: ["CourtOrder", "Manual", "EmployeeLoan", "DisciplinaryPenalty"],
  roundIncomeTax: (value, rule) => Math.round(value / rule) * rule,
};
