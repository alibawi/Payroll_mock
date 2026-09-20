"use client";

import { useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { formatNumber, parseMoney } from "@/lib/payroll/format";
import { cn } from "@/lib/utils";

/**
 * Numeric input for IQD amounts. While focused it holds the raw text; when not focused it shows the
 * value with thousands separators. The value is exposed as `number | null` (null = empty).
 */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder,
  disabled,
  allowNegative = false,
  invalid,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  allowNegative?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft ?? (value === null ? "" : formatNumber(value));
  const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

  return (
    <div dir="ltr" className="relative">
      <Input
        id={id}
        dir="ltr"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        aria-invalid={invalid || undefined}
        value={display}
        onFocus={() => setDraft(value === null ? "" : String(value))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value.replace(/,/g, "");
          if (!pattern.test(raw)) return;
          setDraft(raw);
          onChange(parseMoney(raw));
        }}
        className={cn("pe-12 text-end tabular-nums", className)}
      />
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {t(commonLabels.currencySymbol)}
      </span>
    </div>
  );
}
