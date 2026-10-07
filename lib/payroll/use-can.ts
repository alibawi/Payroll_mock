"use client";

import { useCallback } from "react";

import { useRole } from "@/components/role-provider";
import { can, canSeeAmounts, type PayrollAction, type PayrollSubject } from "@/lib/payroll/permissions";

/** `const can = useCan(); can("payroll.component", "create")` — hides/disables buttons by mock role. */
export function useCan() {
  const { role } = useRole();
  return useCallback((subject: PayrollSubject, action: PayrollAction) => can(role, subject, action), [role]);
}

/** Whether the current mock role may see salary amounts (department heads and anonymous visitors may not). */
export function useCanSeeAmounts() {
  const { role } = useRole();
  return canSeeAmounts(role);
}
