import type { Locale } from "@/components/locale-provider";
import { commonLabels } from "@/lib/i18n/labels";

// Digits are always Latin with thousands separators (matches the ENKI ERP screenshots),
// only the currency suffix follows the UI language.
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatMoney(
  value: number,
  locale: Locale,
  options: { currency?: boolean } = {}
): string {
  const { currency = true } = options;
  const formatted = formatNumber(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return currency
    ? `${sign}${formatted} ${commonLabels.currencySymbol[locale]}`
    : `${sign}${formatted}`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)}%`;
}

/** `2026-09-20` → `20/09/2026` (empty for missing values). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [datePart] = iso.split("T");
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/** Parses user-typed money ("1,270,300.5") into a number; returns null for empty/invalid input. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
