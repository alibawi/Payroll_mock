import type { Role } from "@/components/role-provider";

// Server-safe role guard (components/role-provider is a client module — importing its runtime is not allowed
// from Route Handlers), kept in sync with `roleLabels` in lib/i18n/labels.ts.
const ROLES: Role[] = ["hrManager", "payrollOfficer", "financeAccountant", "deptHead", "employee"];

export function isRole(value: string | null): value is Role {
  return value !== null && (ROLES as string[]).includes(value);
}
