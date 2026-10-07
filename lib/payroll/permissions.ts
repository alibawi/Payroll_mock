import type { Role } from "@/components/role-provider";

// Mock permission matrix for the payroll module (docs/spec-payroll-config.md §5). CASL-style subjects
// and actions; the matrix screen toggles are cosmetic, but these defaults drive real button hiding.
// Later modules append their subjects here (loan, penalty, run…).

export type PayrollSubject =
  | "payroll.component"
  | "payroll.structure"
  | "payroll.config"
  | "payroll.compensation"
  | "payroll.loan"
  | "payroll.penalty"
  | "payroll.period"
  | "payroll.input"
  | "payroll.run"
  | "payroll.report"
  | "payroll.eos";
export type PayrollAction = "view" | "create" | "update" | "delete" | "approve" | "disburse" | "cancel" | "calculate" | "post" | "pay" | "reverse" | "export";

export const PAYROLL_SUBJECTS: PayrollSubject[] = [
  "payroll.component",
  "payroll.structure",
  "payroll.config",
  "payroll.compensation",
  "payroll.loan",
  "payroll.penalty",
  "payroll.period",
  "payroll.input",
  "payroll.run",
  "payroll.report",
  "payroll.eos",
];
export const PAYROLL_ACTIONS: PayrollAction[] = ["view", "create", "update", "delete", "approve", "disburse", "cancel", "calculate", "post", "pay", "reverse", "export"];

const CRUD: PayrollAction[] = ["view", "create", "update", "delete"];
/** Actions that exist for each subject (the matrix only offers these). */
export const SUBJECT_ACTIONS: Record<PayrollSubject, PayrollAction[]> = {
  "payroll.component": CRUD,
  "payroll.structure": CRUD,
  "payroll.config": CRUD,
  "payroll.compensation": ["view", "create", "update"],
  "payroll.loan": ["view", "create", "update", "approve", "disburse", "cancel"],
  "payroll.penalty": ["view", "create", "update", "approve", "cancel"],
  "payroll.period": ["view", "create", "update"],
  "payroll.input": ["view", "create", "update", "delete"],
  "payroll.run": ["view", "create", "update", "delete", "calculate", "approve", "post", "pay", "reverse"],
  "payroll.report": ["view", "export"],
  "payroll.eos": ["view", "create", "update", "approve", "pay", "cancel"],
};

const ALL: PayrollAction[] = ["view", "create", "update", "delete"];
const EDIT: PayrollAction[] = ["view", "create", "update"];
const VIEW: PayrollAction[] = ["view"];

export const DEFAULT_PERMISSIONS: Record<Role, Record<PayrollSubject, PayrollAction[]>> = {
  hrManager: { "payroll.component": ALL, "payroll.structure": ALL, "payroll.config": ALL, "payroll.compensation": EDIT, "payroll.loan": ["view", "create", "update", "approve", "cancel"], "payroll.penalty": ["view", "create", "update", "approve", "cancel"], "payroll.period": VIEW, "payroll.input": EDIT, "payroll.run": ["view", "calculate", "approve"], "payroll.report": ["view", "export"], "payroll.eos": ["view", "create", "update", "approve", "cancel"] },
  payrollOfficer: { "payroll.component": EDIT, "payroll.structure": EDIT, "payroll.config": EDIT, "payroll.compensation": EDIT, "payroll.loan": EDIT, "payroll.penalty": EDIT, "payroll.period": EDIT, "payroll.input": ["view", "create", "update", "delete"], "payroll.run": ["view", "create", "update", "delete", "calculate"], "payroll.report": ["view", "export"], "payroll.eos": ["view", "create", "update"] },
  // Finance only maintains the GL accounts on components (spec §5) — view everywhere, update on components.
  financeAccountant: { "payroll.component": ["view", "update"], "payroll.structure": VIEW, "payroll.config": VIEW, "payroll.compensation": VIEW, "payroll.loan": ["view", "disburse"], "payroll.penalty": VIEW, "payroll.period": VIEW, "payroll.input": VIEW, "payroll.run": ["view", "post", "pay", "reverse"], "payroll.report": ["view", "export"], "payroll.eos": ["view", "pay"] },
  deptHead: { "payroll.component": [], "payroll.structure": [], "payroll.config": [], "payroll.compensation": VIEW, "payroll.loan": ["view", "create"], "payroll.penalty": ["view", "create"], "payroll.period": [], "payroll.input": [], "payroll.run": VIEW, "payroll.report": VIEW, "payroll.eos": [] },
  employee: { "payroll.component": [], "payroll.structure": [], "payroll.config": [], "payroll.compensation": [], "payroll.loan": ["view", "create"], "payroll.penalty": VIEW, "payroll.period": [], "payroll.input": [], "payroll.run": [], "payroll.report": VIEW, "payroll.eos": [] },
};

/**
 * `role === null` (nobody picked a role on /login — there is no route guarding) is treated as the
 * lowest privilege that still lets the screens render: view only.
 */
export function can(role: Role | null, subject: PayrollSubject, action: PayrollAction): boolean {
  if (role === null) return action === "view";
  return DEFAULT_PERMISSIONS[role][subject].includes(action);
}

/** Roles that may see salary amounts. Department heads see their staff list without money (spec-compensation §5). */
export function canSeeAmounts(role: Role | null): boolean {
  // the Employee role only ever reaches their own self-service data (loans, posted payslips)
  return role === "hrManager" || role === "payrollOfficer" || role === "financeAccountant" || role === "employee";
}

/** The mock department a department head is scoped to (stand-in for Data Authority). */
export const DEPT_HEAD_DEPARTMENT = "قسم الهندسة والمشاريع";

/** The mock employee behind the Employee role (self-service: own loans / payslips). */
export const MOCK_EMPLOYEE_ID = "emp-007";
