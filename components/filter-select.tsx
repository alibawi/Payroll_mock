"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FILTER_ALL = "all";

export type FilterSelectOption = { value: string; label: string };

/**
 * Unified list-filter select: always shows "Label: selected value" instead of the bare value,
 * so it stays clear which filter is which when several sit side by side.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  allLabel: string;
  className?: string;
}) {
  const selectedLabel =
    value === FILTER_ALL ? allLabel : (options.find((o) => o.value === value)?.label ?? allLabel);

  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? FILTER_ALL)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={label}>{() => `${label}: ${selectedLabel}`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
