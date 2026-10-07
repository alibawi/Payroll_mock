import type { TaxConfiguration, TaxExemptionKind } from "@/lib/payroll/types";

// Pure income-tax calculation (study 4.4 / 5.5 / 8.3 step 5): exemptions first, then successive brackets.
// Used by the test calculator on the tax screen now and by the payroll engine (module 5) later.

export type TaxPersonProfile = {
  married: boolean;
  children: number;
  ageOver63: boolean;
  disability: boolean;
};

export type TaxStep = {
  bracketId: string;
  from: number;
  to: number | null;
  rate: number;
  /** Part of the taxable amount that falls inside this bracket. */
  slice: number;
  tax: number;
};

export type TaxResult = {
  /** Applied exemptions as monthly amounts (annual ÷ 12), with the multiplier for per-child. */
  exemptions: { kind: TaxExemptionKind; times: number; monthly: number }[];
  exemptionTotal: number;
  taxableAfterExemptions: number;
  steps: TaxStep[];
  tax: number;
  effectiveRate: number;
};

export function computeIncomeTax(
  monthlyTaxableBase: number,
  config: Pick<TaxConfiguration, "brackets" | "exemptions" | "calcBasis">,
  person: TaxPersonProfile
): TaxResult {
  const annualized = config.calcBasis === "Annualized";
  const factor = annualized ? 12 : 1; // brackets are monthly for MonthlyDirect, annual for Annualized

  const wanted: { kind: TaxExemptionKind; times: number }[] = [{ kind: "Personal", times: 1 }];
  if (person.married) wanted.push({ kind: "Married", times: 1 });
  if (person.children > 0) wanted.push({ kind: "PerChild", times: person.children });
  if (person.ageOver63) wanted.push({ kind: "AgeOver63", times: 1 });
  if (person.disability) wanted.push({ kind: "Disability", times: 1 });

  const exemptions = wanted.flatMap(({ kind, times }) => {
    const found = config.exemptions.find((e) => e.kind === kind);
    return found ? [{ kind, times, monthly: (found.annualAmount * times) / 12 }] : [];
  });
  const exemptionTotal = exemptions.reduce((sum, e) => sum + e.monthly, 0);

  const base = Math.max(0, monthlyTaxableBase - exemptionTotal) * factor;
  const sorted = [...config.brackets].sort((a, b) => a.fromAmount - b.fromAmount);
  const steps: TaxStep[] = [];
  let taxTotal = 0;
  for (const b of sorted) {
    const upper = b.toAmount ?? Infinity;
    const slice = Math.max(0, Math.min(base, upper) - b.fromAmount);
    if (slice <= 0) continue;
    const tax = (slice * b.rate) / 100;
    steps.push({ bracketId: b.id, from: b.fromAmount, to: b.toAmount, rate: b.rate, slice, tax });
    taxTotal += tax;
  }

  const monthlyTax = Math.round(taxTotal / factor);
  return {
    exemptions,
    exemptionTotal,
    taxableAfterExemptions: base / factor,
    steps: steps.map((s) => ({ ...s, slice: s.slice / factor, tax: s.tax / factor })),
    tax: monthlyTax,
    effectiveRate: monthlyTaxableBase > 0 ? (monthlyTax / monthlyTaxableBase) * 100 : 0,
  };
}
