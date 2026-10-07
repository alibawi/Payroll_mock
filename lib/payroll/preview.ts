import { effectiveStatus } from "@/lib/payroll/config-validation";
import { computeIncomeTax } from "@/lib/payroll/tax";
import type {
  GovtGradeScale,
  PayrollComponent,
  PayrollProfile,
  PayslipLine,
  PensionConfiguration,
  SalaryStructure,
  SocialSecurityConfiguration,
  TaxConfiguration,
  TaxMaritalStatus,
} from "@/lib/payroll/types";

// Gross / net preview of a compensation for one full month with no attendance (spec-compensation §2.3).
// Pure and shared by the API and the live form preview. It is the seed of lib/payroll/engine.ts (module 5):
// same line order and the same base rules as study 8.3, minus attendance, loans and penalties.

/** Everything the preview needs from module 1, fetched once as `/api/payroll/config/bundle`. */
export type ConfigBundle = {
  components: PayrollComponent[];
  structures: SalaryStructure[];
  profiles: PayrollProfile[];
  gradeScales: GovtGradeScale[];
  taxConfigs: TaxConfiguration[];
  pensionConfigs: PensionConfiguration[];
  socialSecurityConfigs: SocialSecurityConfiguration[];
};

export type PreviewInput = {
  profileId: string;
  salaryStructureId: string;
  gradeStepId: string | null;
  baseSalary: number | null;
  taxMaritalStatus: TaxMaritalStatus;
  eligibleChildrenCount: number;
  isPensionExempt: boolean;
  overrides: { componentId: string; amount: number | null; percent: number | null }[];
  /** ISO date the statutory settings are resolved at (defaults to today). */
  date?: string;
};

export type PreviewResult = {
  lines: PayslipLine[];
  gross: number;
  pensionableBase: number;
  taxableBase: number;
  employeeStatutory: number;
  incomeTax: number;
  net: number;
  employerContribution: number;
  employerCost: number;
  nominalSalary: number | null;
  annualIncrement: number | null;
  warnings: string[];
};

export const roundTo = (value: number, rule: number) => Math.round(value / rule) * rule;

const todayIso = () => new Date().toISOString().slice(0, 10);

export function currentOf<T extends { profileId: string; effectiveFrom: string; effectiveTo: string | null }>(
  items: T[],
  profileId: string,
  date: string
): T | undefined {
  return items.find((i) => i.profileId === profileId && effectiveStatus(i, date) === "Current");
}

export type EarningItem = {
  component: PayrollComponent;
  amount: number;
  base?: number;
  rate?: number;
  quantity?: number;
  override: boolean;
};

export type ResolvedEarnings = {
  earnings: EarningItem[];
  /** component code → amount, the lookup that percentage and statutory bases read from. */
  amounts: Map<string, number>;
  step: GovtGradeScale["steps"][number] | undefined;
  married: boolean;
  rounding: number;
};

/** The earning lines of a compensation at full-month, no-attendance value (shared with the payroll engine). */
export function resolveEarnings(
  input: PreviewInput,
  bundle: ConfigBundle,
  profile: PayrollProfile,
  structure: SalaryStructure,
  warnings: string[]
): ResolvedEarnings {
  const byId = new Map(bundle.components.map((c) => [c.id, c]));
  const overrideOf = (componentId: string) => input.overrides.find((o) => o.componentId === componentId);
  const rounding = profile.roundingRule;

  const step = input.gradeStepId
    ? bundle.gradeScales.flatMap((s) => s.steps).find((s) => s.id === input.gradeStepId)
    : undefined;
  if (input.gradeStepId && !step) warnings.push("gradeStepNotFound");

  const married = input.taxMaritalStatus === "Married";
  const amounts = new Map<string, number>(); // component code → amount
  const earnings: { component: PayrollComponent; amount: number; base?: number; rate?: number; quantity?: number; override: boolean }[] = [];

  const earningLines = [...structure.lines]
    .sort((a, b) => a.sequence - b.sequence)
    .map((line) => ({ line, component: byId.get(line.componentId) }))
    .filter((x): x is { line: (typeof structure.lines)[number]; component: PayrollComponent } =>
      Boolean(x.component?.isActive && x.component.componentType === "Earning")
    );

  // Two passes so a percentage never depends on evaluation order of its base components.
  for (const pass of [1, 2]) {
    for (const { line, component } of earningLines) {
      if (earnings.some((e) => e.component.id === component.id)) continue;
      const override = overrideOf(component.id);
      const method = line.overrideMethod ?? component.calculationMethod;
      const isPercent = method === "PercentOfBase";
      if ((pass === 1) === isPercent) continue;

      let amount: number | undefined;
      let base: number | undefined;
      let rate: number | undefined;
      let quantity: number | undefined;

      if (component.code === "NOMINAL_SALARY") amount = step?.nominalSalary;
      else if (component.code === "BASIC_SALARY") amount = input.baseSalary ?? undefined;
      else if (component.code === "SPOUSE_ALLOWANCE") {
        if (married) amount = override?.amount ?? line.overrideAmount ?? 0;
      } else if (component.code === "CHILD_ALLOWANCE") {
        const each = override?.amount ?? line.overrideAmount ?? 0;
        if (input.eligibleChildrenCount > 0 && each > 0) {
          quantity = input.eligibleChildrenCount;
          rate = each;
          amount = each * quantity;
        }
      } else if (override) {
        // Everything else is an assignment: the structure is the menu, the compensation picks from it.
        if (isPercent) {
          rate = override.percent ?? line.overridePercent ?? component.percentValue ?? 0;
          base = component.baseComponentCodes.reduce((sum, code) => sum + (amounts.get(code) ?? 0), 0);
          amount = roundTo((base * rate) / 100, rounding);
        } else if (method === "FixedAmount") {
          amount = override.amount ?? line.overrideAmount ?? 0;
        }
      }

      if (amount !== undefined && amount !== 0) {
        amounts.set(component.code, amount);
        earnings.push({ component, amount, base, rate, quantity, override: Boolean(override) });
      }
    }
  }
  earnings.sort((a, b) => a.component.sequence - b.component.sequence);
  return { earnings, amounts, step, married, rounding };
}

export function computeCompensationPreview(input: PreviewInput, bundle: ConfigBundle): PreviewResult {
  const date = input.date ?? todayIso();
  const warnings: string[] = [];
  const profile = bundle.profiles.find((p) => p.id === input.profileId);
  const structure = bundle.structures.find((s) => s.id === input.salaryStructureId);
  const empty: PreviewResult = {
    lines: [], gross: 0, pensionableBase: 0, taxableBase: 0, employeeStatutory: 0, incomeTax: 0, net: 0,
    employerContribution: 0, employerCost: 0, nominalSalary: null, annualIncrement: null, warnings,
  };
  if (!profile || !structure) return empty;

  const { earnings, amounts, step, married, rounding } = resolveEarnings(input, bundle, profile, structure, warnings);

  const gross = earnings.reduce((sum, e) => sum + e.amount, 0);
  const lines: PayslipLine[] = earnings.map((e, i) => ({
    id: `pv-e-${i}`,
    componentCode: e.component.code,
    componentName: e.component.name,
    componentType: "Earning",
    base: e.base,
    rate: e.rate,
    quantity: e.quantity,
    amount: e.amount,
    source: e.override ? "Override" : "Structure",
  }));

  // Statutory insurance: government → pension, private → social security (never both — study 4.5).
  let employeeStatutory = 0;
  let employerContribution = 0;
  let pensionableBase = 0;
  const statutoryConfig = profile.enablePension
    ? currentOf(bundle.pensionConfigs, profile.id, date)
    : profile.enableSocialSecurity
      ? currentOf(bundle.socialSecurityConfigs, profile.id, date)
      : undefined;
  const statutoryCategory = profile.enablePension ? "StatutoryPension" : "StatutorySocialSecurity";

  if ((profile.enablePension || profile.enableSocialSecurity) && !statutoryConfig) warnings.push("statutoryConfigMissing");
  if (statutoryConfig && !input.isPensionExempt) {
    pensionableBase = statutoryConfig.baseComponentCodes.reduce((sum, code) => sum + (amounts.get(code) ?? 0), 0);
    employeeStatutory = roundTo((pensionableBase * statutoryConfig.employeeRate) / 100, rounding);
    employerContribution = roundTo((pensionableBase * statutoryConfig.employerRate) / 100, rounding);
    const employeeComp = bundle.components.find((c) => c.category === statutoryCategory && c.componentType === "Deduction");
    const employerComp = bundle.components.find((c) => c.category === statutoryCategory && c.componentType === "EmployerContribution");
    if (employeeComp) {
      lines.push({
        id: "pv-d-ins", componentCode: employeeComp.code, componentName: employeeComp.name, componentType: "Deduction",
        base: pensionableBase, rate: statutoryConfig.employeeRate, amount: employeeStatutory, source: "Statutory",
      });
    }
    if (employerComp) {
      lines.push({
        id: "pv-c-ins", componentCode: employerComp.code, componentName: employerComp.name, componentType: "EmployerContribution",
        base: pensionableBase, rate: statutoryConfig.employerRate, amount: employerContribution, source: "Statutory",
      });
    }
  }

  // Income tax: taxable earnings, less the employee's insurance share, after exemptions, through the brackets.
  const taxableGross = earnings.filter((e) => e.component.isTaxable).reduce((sum, e) => sum + e.amount, 0);
  const taxableBase = Math.max(0, taxableGross - employeeStatutory);
  let incomeTax = 0;
  if (profile.enableIncomeTax) {
    const taxConfig = currentOf(bundle.taxConfigs, profile.id, date);
    if (!taxConfig) warnings.push("taxConfigMissing");
    else {
      const tax = computeIncomeTax(taxableBase, taxConfig, {
        married,
        children: input.eligibleChildrenCount,
        ageOver63: false,
        disability: false,
      });
      incomeTax = roundTo(tax.tax, rounding);
      const taxComp = bundle.components.find((c) => c.category === "IncomeTax");
      if (taxComp) {
        lines.push({
          id: "pv-d-tax", componentCode: taxComp.code, componentName: taxComp.name, componentType: "Deduction",
          base: taxableBase, amount: incomeTax, source: "Statutory",
        });
      }
    }
  }

  const net = gross - employeeStatutory - incomeTax;
  return {
    lines, gross, pensionableBase, taxableBase, employeeStatutory, incomeTax, net,
    employerContribution, employerCost: gross + employerContribution,
    nominalSalary: step?.nominalSalary ?? null, annualIncrement: step?.annualIncrementAmount ?? null, warnings,
  };
}
