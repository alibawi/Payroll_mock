"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OptionSelectOption = { value: string; label: string; disabled?: boolean };

/** Plain (non-searchable) select for short enum lists inside forms; shows the selected option's label. */
export function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  invalid,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "")} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>{() => selected?.label ?? placeholder ?? ""}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
