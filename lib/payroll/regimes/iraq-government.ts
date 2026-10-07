import type { IPayrollRegimeProvider } from "@/lib/payroll/regimes/types";

/** Government: unified pension scheme (the state pays the employer share); tax rounded to the rounding rule. */
export const iraqGovernment: IPayrollRegimeProvider = {
  id: "iraq-government",
  statutoryKind: "Pension",
  employeeCategory: "StatutoryPension",
  deductionOrder: ["CourtOrder", "Manual", "EmployeeLoan", "DisciplinaryPenalty"],
  roundIncomeTax: (value, rule) => Math.round(value / rule) * rule,
};
