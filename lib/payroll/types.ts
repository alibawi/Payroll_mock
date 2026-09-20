// Shared payroll types. Entity types are added here module by module (docs/spec-payroll-*.md §2);
// this first slice only covers what the shared components (0.8) render.

export type ComponentType =
  | "Earning"
  | "Deduction"
  | "EmployerContribution"
  | "Informational";

/** Where a payslip line came from (docs/spec-payroll-runs.md 2.6). */
export type PayslipLineSource =
  | "Structure"
  | "Override"
  | "Input"
  | "Loan"
  | "Statutory"
  | "Penalty"
  | "Attendance";

export type PayslipLine = {
  id: string;
  componentCode: string;
  componentName: { ar: string; en: string };
  componentType: ComponentType;
  base?: number;
  rate?: number;
  quantity?: number;
  amount: number;
  source?: PayslipLineSource;
  remark?: string;
};

/** One line of a payroll / loan / end-of-service journal entry (docs/spec-payroll-runs.md 2.7). */
export type JournalLine = {
  id: string;
  accountCode: string;
  accountName: { ar: string; en: string };
  debit: number;
  credit: number;
  memo?: string;
  costCenter?: string;
};
