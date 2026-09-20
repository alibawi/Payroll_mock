"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/locale-provider";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { commonLabels } from "@/lib/i18n/labels";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[] | string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function normalizeOptions(
  options: SearchableSelectOption[] | string[]
): SearchableSelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

/**
 * Searchable dropdown (built on the shared Combobox) — the single replacement for a plain
 * Select on any picker (static lists or lists built from mock data).
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
}: SearchableSelectProps) {
  const { t } = useLocale();
  const items = useMemo(() => normalizeOptions(options), [options]);
  const selected = useMemo(
    () => items.find((item) => item.value === value) ?? null,
    [items, value]
  );

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item) => onValueChange(item?.value ?? "")}
      disabled={disabled}
    >
      <ComboboxInput placeholder={placeholder} className={className} showClear />
      <ComboboxContent>
        <ComboboxEmpty>{t(commonLabels.noResults)}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
