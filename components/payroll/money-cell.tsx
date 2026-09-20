"use client";

import { useLocale } from "@/components/locale-provider";
import { formatMoney } from "@/lib/payroll/format";
import { cn } from "@/lib/utils";

/**
 * Renders an IQD amount: Latin digits with thousands separators, always left-to-right and
 * non-wrapping (so it stays intact inside RTL text), plus the currency suffix in the UI language.
 */
export function MoneyCell({
  value,
  currency = true,
  parens = false,
  signed = false,
  bold = false,
  muted = false,
  className,
}: {
  value: number;
  /** Append the currency symbol ("د.ع" / "IQD"). */
  currency?: boolean;
  /** Show negatives as `(1,000)` instead of `-1,000` (accounting style). */
  parens?: boolean;
  /** Colour negatives with the destructive tone. */
  signed?: boolean;
  bold?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const { locale } = useLocale();
  const negative = value < 0;
  const text = parens && negative ? `(${formatMoney(Math.abs(value), locale, { currency })})` : formatMoney(value, locale, { currency });

  return (
    <span
      dir="ltr"
      className={cn(
        "inline-block whitespace-nowrap tabular-nums",
        bold && "font-semibold",
        muted && "text-muted-foreground",
        signed && negative && "text-destructive",
        className
      )}
    >
      {text}
    </span>
  );
}
