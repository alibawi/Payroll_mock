import { addMonths } from "@/lib/payroll/periods";
import type { OverBreachAction, PenaltyType } from "@/lib/payroll/types";

// Penalty amount, the monthly deduction cap and the instalment spread (study 3.4, 8.3 step 6.5; decisions 16–18).

/** Instalments are rounded down to the nearest 250 IQD; the last one absorbs the remainder. */
const STEP = 250;
const MAX_MONTHS = 60;

/** P-1: the penalty amount from its type and value. `monthlyBasic` is the day-rate basis (basic pay). */
export function computePenaltyAmount(
  type: PenaltyType,
  value: number | null,
  basis: { dayRate: number; monthlyBasic: number }
): number {
  switch (type) {
    case "FixedAmount":
      return Math.round(value ?? 0);
    case "DaysOfPay":
      return Math.round((value ?? 0) * basis.dayRate);
    case "OneMonthSalary":
      return Math.round(basis.monthlyBasic);
    case "PercentOfSalary":
      return Math.round(((value ?? 0) * basis.monthlyBasic) / 100);
  }
}

/** P-3: room left under the cap = `gross × cap%` minus the other deductions already due that month. */
export function monthlyCapacity(gross: number, capPercent: number, otherDeductions: number): number {
  return Math.max(0, Math.round((gross * capPercent) / 100) - otherDeductions);
}

export type SpreadRow = { seqNo: number; duePeriodId: string; amount: number; capacity: number; exceeds: boolean };

export type SpreadPlan = {
  rows: SpreadRow[];
  months: number;
  /** The months were increased automatically to respect the cap (P-4 / AutoSpread). */
  autoSpread: boolean;
  /** Not possible: no capacity at all, or the Block policy forbids spreading (P-5). */
  blocked: boolean;
  /** Smallest number of months that fits the cap (null when none does). */
  minimalMonths: number | null;
};

function split(amount: number, months: number): number[] {
  if (months <= 1) return [amount];
  const each = Math.floor(amount / months / STEP) * STEP;
  return [...Array.from({ length: months - 1 }, () => each), amount - each * (months - 1)];
}

/**
 * Plans the instalments of a penalty. `capacityOf(periodId)` gives the room under the monthly cap of each period.
 *  - OneMonthSalary is always spread over the fewest months that fit (P-4);
 *  - other types honour `requestedMonths`, and when the cap is exceeded either spread further (`AutoSpread`) or
 *    refuse (`Block`) — P-5.
 */
export function planSpread(args: {
  amount: number;
  type: PenaltyType;
  requestedMonths: number;
  startPeriodId: string;
  capacityOf: (periodId: string) => number;
  action: OverBreachAction;
}): SpreadPlan {
  const periodAt = (i: number) => addMonths(args.startPeriodId, i);
  const build = (months: number): SpreadRow[] =>
    split(args.amount, months).map((amount, i) => {
      const capacity = args.capacityOf(periodAt(i));
      return { seqNo: i + 1, duePeriodId: periodAt(i), amount, capacity, exceeds: amount > capacity };
    });
  const fits = (rows: SpreadRow[]) => rows.every((r) => !r.exceeds);

  const from = args.type === "OneMonthSalary" ? 1 : Math.max(1, Math.floor(args.requestedMonths));
  let minimalMonths: number | null = null;
  for (let n = from; n <= MAX_MONTHS; n++) {
    if (fits(build(n))) {
      minimalMonths = n;
      break;
    }
  }

  const requestedRows = build(from);
  if (fits(requestedRows)) {
    return { rows: requestedRows, months: from, autoSpread: false, blocked: false, minimalMonths };
  }
  if (minimalMonths === null) return { rows: requestedRows, months: from, autoSpread: false, blocked: true, minimalMonths };
  if (args.type !== "OneMonthSalary" && args.action === "Block") {
    return { rows: requestedRows, months: from, autoSpread: false, blocked: true, minimalMonths };
  }
  return { rows: build(minimalMonths), months: minimalMonths, autoSpread: true, blocked: false, minimalMonths };
}
