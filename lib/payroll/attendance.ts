import type { AttendancePenaltyPolicy, PayrollProfile } from "@/lib/payroll/types";

// Absence and lateness deductions computed from attendance (study 3.4 / 8.3 step 3.5). Pure functions shared by
// the attendance simulator now and by the payroll engine (module 5) later. Both reduce Gross (`ReducesGross`).

/** Day rate = basis ÷ working days (or calendar days per the profile), rounded to a whole dinar (study 12.4: 34,615). */
export function dayRate(
  basis: number,
  profile: Pick<PayrollProfile, "dayRateBasis">,
  days: { workingDays: number; calendarDays: number }
): number {
  const divisor = profile.dayRateBasis === "WorkingDays" ? days.workingDays : days.calendarDays;
  return divisor > 0 ? Math.round(basis / divisor) : 0;
}

export function absenceDeduction(rate: number, absenceDays: number): number {
  return Math.round(rate * Math.max(0, absenceDays));
}

export type LateEventResult = {
  minutes: number;
  /** Ignored because it is within the grace period. */
  withinGrace: boolean;
  /** Matched tier as "from–to" text, or the method used. */
  rule: string;
  dayFraction: number;
  amount: number;
};

export type LatenessResult = {
  events: LateEventResult[];
  countedEvents: number;
  total: number;
  /** CountBased only: whole days cut once the threshold is reached. */
  dayCuts: number;
};

/**
 * Lateness deduction under the profile's `AttendancePenaltyPolicy`:
 *  - arrivals within `graceMinutes` are ignored;
 *  - Tiers: each remaining arrival costs `dayFraction × day rate` of the tier its minutes fall in;
 *  - PerMinute: minutes × rate per minute;
 *  - CountBased: every `maxLateEventsBeforeDayCut` counted arrivals cut one day.
 */
export function latenessDeduction(policy: AttendancePenaltyPolicy, lateMinutes: number[], rate: number): LatenessResult {
  const tiers = [...policy.latenessTiers].sort((a, b) => a.fromMinutes - b.fromMinutes);
  const events: LateEventResult[] = lateMinutes.map((minutes) => {
    if (minutes <= policy.graceMinutes) {
      return { minutes, withinGrace: true, rule: "grace", dayFraction: 0, amount: 0 };
    }
    if (policy.latenessMethod === "Tiers") {
      const tier = tiers.find((t) => minutes >= t.fromMinutes && (t.toMinutes == null || minutes <= t.toMinutes));
      const fraction = tier?.dayFraction ?? 0;
      return {
        minutes,
        withinGrace: false,
        rule: tier ? `${tier.fromMinutes}–${tier.toMinutes ?? "∞"}` : "—",
        dayFraction: fraction,
        amount: Math.round(rate * fraction),
      };
    }
    if (policy.latenessMethod === "PerMinute") {
      return { minutes, withinGrace: false, rule: "perMinute", dayFraction: 0, amount: Math.round(minutes * (policy.latenessRatePerMinute ?? 0)) };
    }
    return { minutes, withinGrace: false, rule: "count", dayFraction: 0, amount: 0 };
  });

  const counted = events.filter((e) => !e.withinGrace).length;
  let dayCuts = 0;
  // The total rounds the exact sum once (study 12.4: 3 × ½ × 34,615 = 51,922.5 → 51,923), not event by event.
  let total = Math.round(
    events.reduce((sum, e) => sum + (e.withinGrace ? 0 : policy.latenessMethod === "Tiers" ? rate * e.dayFraction : e.amount), 0)
  );
  if (policy.latenessMethod === "CountBased" && policy.maxLateEventsBeforeDayCut) {
    dayCuts = Math.floor(counted / policy.maxLateEventsBeforeDayCut);
    total = dayCuts * rate;
  }
  return { events, countedEvents: counted, total, dayCuts };
}
