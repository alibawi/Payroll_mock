// Payroll period helpers. A period id is `YYYY-MM` for now; module 5 (PayrollPeriod) keeps the same ids,
// so loan instalments created here already point at real periods later.

/** The open payroll month of the mock (the demo data is anchored to it). */
export const CURRENT_PERIOD = "2026-10";

export function addMonths(periodId: string, months: number): string {
  const [year, month] = periodId.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Pay date of a period = its last calendar day. */
export function periodEnd(periodId: string): string {
  const [year, month] = periodId.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${periodId}-${String(last).padStart(2, "0")}`;
}

/** `2026-03` → `03/2026`. */
export function formatPeriod(periodId: string | null | undefined): string {
  if (!periodId) return "";
  const [year, month] = periodId.split("-");
  return `${month}/${year}`;
}

export const isValidPeriod = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** The "today" of the mock (the demo data is anchored to it). */
export const MOCK_TODAY = "2026-10-07";
