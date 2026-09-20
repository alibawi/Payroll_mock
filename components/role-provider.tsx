"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { roleLabels } from "@/lib/i18n/labels";
import { usePersistedString } from "@/lib/use-persisted-string";

export type Role = keyof typeof roleLabels;

const STORAGE_KEY = "role";

export function isRole(value: string | null): value is Role {
  return value !== null && Object.hasOwn(roleLabels, value);
}

type RoleContextValue = {
  /** `null` until someone picks a role on /login (there is no route guarding — see WORKLOG). */
  role: Role | null;
  setRole: (role: Role) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistedString(STORAGE_KEY);
  const role = isRole(stored) ? stored : null;

  const setRole = useCallback((next: Role) => setStored(next), [setStored]);
  const clearRole = useCallback(() => setStored(null), [setStored]);

  const value = useMemo(
    () => ({ role, setRole, clearRole }),
    [role, setRole, clearRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
