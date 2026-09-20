"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { SearchableSelect } from "@/components/searchable-select";
import { componentLabels } from "@/lib/i18n/labels";
import type { Employee } from "@/lib/types/hr";

interface EmployeeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Pre-loaded list (skips the fetch) — for pages that already hold the employees. */
  employees?: Employee[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable employee picker, fed from `/api/hr/employees` (the HR integration placeholder)
 * unless a list is passed in. Replaces any free-text "employee" field across the modules.
 */
export function EmployeeSelect({
  value,
  onValueChange,
  employees: preloaded,
  placeholder,
  disabled,
  className,
}: EmployeeSelectProps) {
  const { locale, t } = useLocale();
  const [fetched, setFetched] = useState<Employee[] | null>(null);

  useEffect(() => {
    if (preloaded) return;
    let cancelled = false;
    fetch("/api/hr/employees")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Employee[]) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [preloaded]);

  const employees = preloaded ?? fetched;

  const options = useMemo(
    () =>
      (employees ?? [])
        .map((employee) => ({
          value: employee.id,
          label: locale === "ar" ? employee.fullNameAr : employee.fullNameEn,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [employees, locale]
  );

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder ?? t(componentLabels.selectEmployee)}
      disabled={disabled ?? employees === null}
      className={className}
    />
  );
}
