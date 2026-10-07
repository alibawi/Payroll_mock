import { absenceDeduction, dayRate, latenessDeduction } from "@/lib/payroll/attendance";
import { currentOf, resolveEarnings, roundTo, type ConfigBundle, type EarningItem } from "@/lib/payroll/preview";
import { regimeFor } from "@/lib/payroll/regimes";
import { computeIncomeTax } from "@/lib/payroll/tax";
import type {
  ComponentCategory,
  LocalizedText,
  PayrollComponent,
  PayslipLineRecord,
  PayslipLineSource,
  RunWarning,
  ScheduleSource,
  TaxMaritalStatus,
  TraceRow,
  TraceStep,
} from "@/lib/payroll/types";

// The payroll calculation pipeline (study 8.3, spec-payroll-runs §4) as pure functions: no I/O, no store,
// so the same code runs in the Route Handlers, in the seed generator and in the golden tests (12.1 / 12.2 / 12.4).
//
//  1 resolve  2 time data  3 earnings (+ proration, overtime, inputs)  3.5 attendance deductions
//  4 bases    5 statutory + income tax    6 other deductions    6.5 net protection
//  7 totals   8 rounding + lines          9 validation

export type EngineCompensation = {
  profileId: string;
  salaryStructureId: string;
  gradeStepId: string | null;
  baseSalary: number | null;
  taxMaritalStatus: TaxMaritalStatus;
  eligibleChildrenCount: number;
  isPensionExempt: boolean;
  overrides: { componentId: string; amount: number | null; percent: number | null }[];
};

/** Attendance / leave facts of one employee in one period (from the HR placeholders). */
export type EngineTime = {
  workingDays: number;
  calendarDays: number;
  absenceDays: number;
  lateEvents: number[];
  lwpDays: number;
  paidLeaveDays: number;
  overtimeHours: number;
  /** Calendar days of the period the employee is actually employed / covered by the compensation. */
  coverageDays: number;
  hasAttendanceData: boolean;
};

export type EngineEarningInput = { id: string; componentId: string; amount: number; quantity: number | null; reason: string };

export type EngineDeductionItem = {
  sourceType: ScheduleSource;
  sourceId: string;
  ref: string;
  amount: number;
  /** Component of a manual deduction input. */
  componentId?: string;
};

export type EngineInput = {
  periodKey: string;
  periodEnd: string;
  compensation: EngineCompensation;
  bundle: ConfigBundle;
  time: EngineTime;
  earningInputs: EngineEarningInput[];
  deductionItems: EngineDeductionItem[];
  /** `supplementary` (bonus / off-cycle / adjustment runs): the inputs only — no structure, attendance, loans or tax. */
  mode?: "full" | "supplementary";
};

export type EngineWarning = Pick<RunWarning, "severity" | "code" | "message" | "amount">;

export type EngineLine = Omit<PayslipLineRecord, "id" | "payslipId">;

export type ScheduleOutcome = EngineDeductionItem & { applied: number; deferred: number };

export type EngineResult = {
  lines: EngineLine[];
  grossEarnings: number;
  dayRate: number;
  dayRateBasis: number;
  absenceDeduction: number;
  latenessDeduction: number;
  grossPay: number;
  pensionableBase: number;
  socialSecurityBase: number;
  taxableBase: number;
  taxableAfterExemptions: number;
  incomeTax: number;
  employeeStatutory: number;
  employerContribution: number;
  otherDeductions: number;
  totalEmployeeDeductions: number;
  netPay: number;
  employerCost: number;
  workedDays: number;
  schedule: ScheduleOutcome[];
  netProtection: { cap: number; requested: number; applied: number; deferred: number; action: "AutoSpread" | "Block"; triggered: boolean };
  netProtectionFlag: "Spread" | "Blocked" | null;
  warnings: EngineWarning[];
  trace: TraceStep[];
  nominalSalary: number | null;
};

const L = (ar: string, en: string): LocalizedText => ({ ar, en });
const fmt = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

type Draft = {
  component: PayrollComponent;
  amount: number;
  base?: number;
  rate?: number;
  quantity?: number;
  source: PayslipLineSource;
  remark?: string;
};

export function calculatePayslip(input: EngineInput): EngineResult {
  const { bundle, compensation, time } = input;
  const supplementary = input.mode === "supplementary";
  const profile = bundle.profiles.find((p) => p.id === compensation.profileId);
  const structure = bundle.structures.find((s) => s.id === compensation.salaryStructureId);
  const warnings: EngineWarning[] = [];
  const trace: TraceStep[] = [];
  const addStep = (step: string, title: LocalizedText, rows: TraceRow[]) => trace.push({ step, title, rows });

  if (!profile || !structure) {
    throw new Error(`Compensation points to a missing profile/structure (${compensation.profileId} / ${compensation.salaryStructureId})`);
  }
  const regime = regimeFor(profile);
  const rounding = profile.roundingRule;
  const policy = profile.attendancePenaltyPolicy;
  const byId = new Map(bundle.components.map((c) => [c.id, c]));
  const byCategory = (category: ComponentCategory) => bundle.components.find((c) => c.category === category && c.isActive);

  // ── 1 · resolve ───────────────────────────────────────────────────────────────────────────────
  const previewInput = {
    profileId: profile.id,
    salaryStructureId: structure.id,
    gradeStepId: compensation.gradeStepId,
    baseSalary: compensation.baseSalary,
    taxMaritalStatus: compensation.taxMaritalStatus,
    eligibleChildrenCount: compensation.eligibleChildrenCount,
    isPensionExempt: compensation.isPensionExempt,
    overrides: compensation.overrides,
    date: input.periodEnd,
  };
  const resolved = supplementary
    ? { earnings: [] as EarningItem[], amounts: new Map<string, number>(), step: undefined, married: compensation.taxMaritalStatus === "Married", rounding }
    : resolveEarnings(previewInput, bundle, profile, structure, []);
  addStep("1", L("تحديد الموظف والتعويض النافذ", "Resolve employee and effective compensation"), [
    { label: L("الملف", "Profile"), value: profile.code },
    { label: L("هيكل الراتب", "Salary structure"), value: structure.code },
    ...(resolved.step ? [{ label: L("الخلية بالسلّم", "Grade cell"), value: `${resolved.step.grade}/${resolved.step.step}` }] : []),
    { label: L("الفترة", "Period"), value: input.periodKey },
  ]);

  // ── 2 · time data ─────────────────────────────────────────────────────────────────────────────
  const coverage = Math.min(1, Math.max(0, time.coverageDays / Math.max(1, time.calendarDays)));
  const unpaidShare = time.workingDays > 0 ? Math.min(1, time.lwpDays / time.workingDays) : 0;
  const prorateFactor = supplementary ? 1 : Math.max(0, coverage * (1 - unpaidShare));
  const scheduledDays = Math.round(time.workingDays * coverage);
  const workedDays = Math.max(0, scheduledDays - time.lwpDays - time.absenceDays - time.paidLeaveDays);
  addStep("2", L("بيانات الحضور والإجازات", "Time data"), [
    { label: L("أيام العمل بالفترة", "Working days"), value: time.workingDays },
    { label: L("أيام الغياب", "Absence days"), value: time.absenceDays },
    { label: L("أحداث التأخير (دقائق)", "Late events (minutes)"), value: time.lateEvents.length ? time.lateEvents.join(", ") : "—" },
    { label: L("إجازة بلا راتب", "Unpaid leave days"), value: time.lwpDays },
    { label: L("ساعات إضافية", "Overtime hours"), value: time.overtimeHours },
    { label: L("نسبة التغطية بالفترة", "Period coverage"), formula: `${time.coverageDays} ÷ ${time.calendarDays}`, value: `${(coverage * 100).toFixed(1)}%` },
  ]);
  if (!time.hasAttendanceData && !supplementary) {
    warnings.push({
      severity: "Info",
      code: "NO_ATTENDANCE",
      message: L("لا توجد بيانات حضور للفترة — افتُرض دوام كامل", "No attendance data for the period — full attendance assumed"),
    });
  }

  // ── 3 · earnings ──────────────────────────────────────────────────────────────────────────────
  const drafts: Draft[] = [];
  const prorated = prorateFactor < 1;
  for (const e of resolved.earnings) {
    let amount = e.amount;
    let remark: string | undefined;
    let rate = e.rate;
    let base = e.base;
    if (prorated && e.component.isProratable) {
      base = e.amount;
      rate = Math.round(prorateFactor * 10000) / 100;
      amount = roundTo(e.amount * prorateFactor, rounding);
      remark = `× ${rate}%`;
    }
    // a per-unit amount (children allowance) is shown as base × quantity, never as a percentage rate
    const perUnit = e.component.code === "CHILD_ALLOWANCE";
    drafts.push({ component: e.component, amount, base: perUnit ? e.rate : base, rate: perUnit ? undefined : rate, quantity: e.quantity, source: e.override ? "Override" : "Structure", remark });
  }
  if (prorated && !supplementary) {
    warnings.push({
      severity: "Info",
      code: "PRORATED",
      message: L(`الراتب مُحتسب بنسبة ${(prorateFactor * 100).toFixed(1)}٪ (تعيين/إنهاء خلال الفترة أو إجازة بلا راتب)`, `Pay prorated to ${(prorateFactor * 100).toFixed(1)}% (joined/left within the period or unpaid leave)`),
    });
  }

  const basicAmount = resolved.amounts.get("BASIC_SALARY") ?? resolved.amounts.get("NOMINAL_SALARY") ?? 0;
  const overtimeComponent = supplementary
    ? undefined
    : structure.lines
        .map((l) => byId.get(l.componentId))
        .find((c): c is PayrollComponent => Boolean(c && c.isActive && c.componentType === "Earning" && c.category === "Overtime"));
  if (overtimeComponent && time.overtimeHours > 0 && basicAmount > 0) {
    const multiplier = profile.overtimeMultiplierNormal;
    const exact = (time.overtimeHours * (basicAmount / 192)) * multiplier;
    drafts.push({
      component: overtimeComponent,
      amount: roundTo(exact, rounding),
      base: basicAmount,
      quantity: time.overtimeHours,
      source: "Attendance",
      remark: `${time.overtimeHours} h × (${fmt(basicAmount)} ÷ 192) × ${multiplier}`,
    });
  }
  for (const input_ of input.earningInputs) {
    const component = byId.get(input_.componentId);
    if (!component) continue;
    drafts.push({
      component,
      amount: input_.amount,
      quantity: input_.quantity ?? undefined,
      source: "Input",
      remark: input_.reason,
    });
  }
  drafts.sort((a, b) => a.component.sequence - b.component.sequence);

  const amountsByCode = new Map<string, number>();
  for (const d of drafts) amountsByCode.set(d.component.code, (amountsByCode.get(d.component.code) ?? 0) + d.amount);
  const grossEarnings = drafts.reduce((s, d) => s + d.amount, 0);
  addStep(
    "3",
    L("حساب الاستحقاقات", "Earnings"),
    [
      ...drafts.map<TraceRow>((d) => ({
        label: d.component.name,
        formula: d.remark ?? (d.quantity && d.rate ? `${fmt(d.quantity)} × ${fmt(d.rate)}` : d.base && d.rate ? `${fmt(d.base)} × ${fmt(d.rate)}%` : undefined),
        value: d.amount,
      })),
      { label: L("إجمالي الاستحقاقات (Gross Earnings)", "Gross earnings"), value: grossEarnings },
    ]
  );

  // ── 3.5 · attendance deductions ───────────────────────────────────────────────────────────────
  let basis = 0;
  let rate = 0;
  let absence = 0;
  let lateness = 0;
  let latenessDetail = "";
  if (!supplementary) {
    basis = policy.absenceDayRateComponentCodes.reduce((s, code) => s + (amountsByCode.get(code) ?? 0), 0);
    rate = dayRate(basis, profile, { workingDays: time.workingDays, calendarDays: time.calendarDays });
    absence = absenceDeduction(rate, time.absenceDays);
    const late = latenessDeduction(policy, time.lateEvents, rate);
    lateness = late.total;
    latenessDetail = late.events
      .filter((e) => !e.withinGrace)
      .map((e) => `${e.minutes}m×${e.dayFraction}`)
      .join(" + ");
  }
  const attendanceTotal = absence + lateness;
  const grossPay = grossEarnings - attendanceTotal;
  addStep("3.5", L("خصومات الحضور (الغياب والتأخير)", "Attendance deductions"), [
    { label: L("أساس معدّل اليوم", "Day-rate basis"), value: basis },
    {
      label: L("معدّل اليوم", "Day rate"),
      formula: `${fmt(basis)} ÷ ${profile.dayRateBasis === "WorkingDays" ? time.workingDays : time.calendarDays}`,
      value: rate,
    },
    { label: L("خصم الغياب", "Absence deduction"), formula: `${fmt(rate)} × ${time.absenceDays}`, value: -absence },
    { label: L("خصم التأخير", "Lateness deduction"), formula: latenessDetail ? `${latenessDetail} × ${fmt(rate)}` : undefined, value: -lateness },
    { label: L("الإجمالي بعد الخصم (Gross Pay)", "Gross pay"), formula: `${fmt(grossEarnings)} − ${fmt(attendanceTotal)}`, value: grossPay },
  ]);

  // ── 4 · bases ─────────────────────────────────────────────────────────────────────────────────
  const taxableGross = Math.max(0, drafts.filter((d) => d.component.isTaxable).reduce((s, d) => s + d.amount, 0) - attendanceTotal);

  // ── 5 · statutory deductions and income tax ───────────────────────────────────────────────────
  const lines: EngineLine[] = [];
  const pushLine = (component: PayrollComponent, line: Partial<EngineLine> & { amount: number; source: PayslipLineSource }) =>
    lines.push({
      componentId: component.id,
      componentCode: component.code,
      componentName: component.name,
      componentType: component.componentType,
      category: component.category,
      isEmployerContribution: component.componentType === "EmployerContribution",
      expenseAccountCode: component.expenseAccountCode,
      payableAccountCode: component.payableAccountCode,
      sequence: component.sequence,
      ...line,
    });

  for (const d of drafts) {
    pushLine(d.component, { amount: d.amount, base: d.base, rate: d.rate, quantity: d.quantity, source: d.source, remark: d.remark });
  }

  let employeeStatutory = 0;
  let employerContribution = 0;
  let pensionableBase = 0;
  let socialSecurityBase = 0;
  const statutoryRows: TraceRow[] = [];
  if (!supplementary) {
    const statutoryConfig =
      regime.statutoryKind === "Pension" && profile.enablePension
        ? currentOf(bundle.pensionConfigs, profile.id, input.periodEnd)
        : regime.statutoryKind === "SocialSecurity" && profile.enableSocialSecurity
          ? currentOf(bundle.socialSecurityConfigs, profile.id, input.periodEnd)
          : undefined;
    const needsStatutory = (regime.statutoryKind === "Pension" && profile.enablePension) || (regime.statutoryKind === "SocialSecurity" && profile.enableSocialSecurity);
    if (needsStatutory && !statutoryConfig) {
      warnings.push({
        severity: "Blocker",
        code: "STATUTORY_CONFIG_MISSING",
        message: L("لا توجد إعدادات تقاعد/ضمان نافذة للفترة", "No effective pension / social-security setting for the period"),
      });
    }
    if (statutoryConfig && !compensation.isPensionExempt) {
      const rawBase = statutoryConfig.baseComponentCodes.reduce((s, code) => s + (amountsByCode.get(code) ?? 0), 0);
      const base = Math.max(0, rawBase - attendanceTotal);
      employeeStatutory = roundTo((base * statutoryConfig.employeeRate) / 100, rounding);
      employerContribution = roundTo((base * statutoryConfig.employerRate) / 100, rounding);
      if (regime.statutoryKind === "Pension") pensionableBase = base;
      else socialSecurityBase = base;
      const employeeComp = bundle.components.find((c) => c.category === regime.employeeCategory && c.componentType === "Deduction");
      const employerComp = bundle.components.find((c) => c.category === regime.employeeCategory && c.componentType === "EmployerContribution");
      if (employeeComp) pushLine(employeeComp, { amount: employeeStatutory, base, rate: statutoryConfig.employeeRate, source: "Statutory" });
      if (employerComp) pushLine(employerComp, { amount: employerContribution, base, rate: statutoryConfig.employerRate, source: "Statutory" });
      statutoryRows.push(
        { label: L("وعاء الاستقطاع", "Insured base"), formula: attendanceTotal ? `${fmt(rawBase)} − ${fmt(attendanceTotal)}` : undefined, value: base },
        { label: L("حصة الموظف", "Employee share"), formula: `${fmt(base)} × ${statutoryConfig.employeeRate}%`, value: -employeeStatutory },
        { label: L("حصة صاحب العمل", "Employer share"), formula: `${fmt(base)} × ${statutoryConfig.employerRate}%`, value: employerContribution }
      );
    } else if (compensation.isPensionExempt) {
      statutoryRows.push({ label: L("الموظف مستثنى من الاستقطاع التقاعدي", "Employee is exempt from the statutory scheme"), value: 0 });
    }
  }

  const taxableBase = Math.max(0, taxableGross - employeeStatutory);
  let incomeTax = 0;
  let taxableAfterExemptions = 0;
  if (!supplementary && profile.enableIncomeTax) {
    const taxConfig = currentOf(bundle.taxConfigs, profile.id, input.periodEnd);
    if (!taxConfig) {
      warnings.push({ severity: "Blocker", code: "TAX_CONFIG_MISSING", message: L("لا توجد شرائح ضريبة نافذة للفترة", "No effective tax setting for the period") });
    } else {
      const tax = computeIncomeTax(taxableBase, taxConfig, {
        married: compensation.taxMaritalStatus === "Married",
        children: compensation.eligibleChildrenCount,
        ageOver63: false,
        disability: false,
      });
      incomeTax = regime.roundIncomeTax(tax.tax, rounding);
      taxableAfterExemptions = Math.round(tax.taxableAfterExemptions);
      const taxComp = byCategory("IncomeTax");
      if (taxComp) pushLine(taxComp, { amount: incomeTax, base: taxableBase, source: "Statutory" });
      statutoryRows.push(
        { label: L("الدخل الخاضع للضريبة", "Taxable gross"), value: taxableGross },
        { label: L("بعد خصم حصة الموظف من التأمين", "Less the employee insurance share"), formula: `${fmt(taxableGross)} − ${fmt(employeeStatutory)}`, value: taxableBase },
        ...tax.exemptions.map<TraceRow>((x) => ({
          label: L(`إعفاء ${x.kind}${x.times > 1 ? ` × ${x.times}` : ""}`, `Exemption ${x.kind}${x.times > 1 ? ` × ${x.times}` : ""}`),
          value: -Math.round(x.monthly),
        })),
        { label: L("الوعاء بعد الإعفاءات", "Taxable after exemptions"), value: Math.round(tax.taxableAfterExemptions) },
        ...tax.steps.map<TraceRow>((s) => ({
          label: L(`شريحة ${fmt(s.from)}–${s.to == null ? "∞" : fmt(s.to)} (${s.rate}%)`, `Bracket ${fmt(s.from)}–${s.to == null ? "∞" : fmt(s.to)} (${s.rate}%)`),
          formula: `${fmt(Math.round(s.slice))} × ${s.rate}%`,
          value: Math.round(s.tax),
        })),
        { label: L("ضريبة الدخل", "Income tax"), formula: `round(${fmt(tax.tax)}, ${rounding})`, value: incomeTax }
      );
      const taxableComp = bundle.components.find((c) => c.code === "TAXABLE_BASE");
      if (taxableComp) pushLine(taxableComp, { amount: taxableBase, source: "Statutory" });
    }
  } else if (supplementary) {
    warnings.push({
      severity: "Info",
      code: "SUPPLEMENTARY_NO_TAX",
      message: L("الدورة التكميلية بلا ضريبة/تأمين — تُحتسب بالدورة العادية القادمة (موك أب)", "Supplementary run without tax or insurance — settled by the next regular run (mock)"),
    });
  }
  addStep("4", L("الأوعية", "Bases"), [
    ...(regime.statutoryKind === "Pension"
      ? [{ label: L("وعاء التقاعد", "Pensionable base"), value: pensionableBase }]
      : [{ label: L("وعاء الضمان الاجتماعي", "Social-security base"), value: socialSecurityBase }]),
    { label: L("الدخل الخاضع للضريبة (قبل التأمين)", "Taxable gross (before insurance)"), value: taxableGross },
  ]);
  addStep("5", L("الاستقطاعات القانونية وضريبة الدخل", "Statutory deductions and income tax"), statutoryRows);

  // ── 6 · other deductions + 6.5 · net protection ───────────────────────────────────────────────
  const order = regime.deductionOrder;
  const items = [...input.deductionItems].sort((a, b) => order.indexOf(a.sourceType as (typeof order)[number]) - order.indexOf(b.sourceType as (typeof order)[number]));
  const requested = items.reduce((s, i) => s + i.amount, 0);
  const cap = supplementary ? Number.POSITIVE_INFINITY : Math.round((grossPay * policy.maxMonthlyDeductionPercent) / 100);
  const overBreach = requested > cap;
  const blocked = overBreach && policy.overBreachAction === "Block";
  let remaining = blocked || !overBreach ? Number.POSITIVE_INFINITY : cap;
  const schedule: ScheduleOutcome[] = items.map((item) => {
    const applied = Math.min(item.amount, remaining);
    if (Number.isFinite(remaining)) remaining -= applied;
    return { ...item, applied, deferred: item.amount - applied };
  });

  const componentForItem = (item: EngineDeductionItem): PayrollComponent | undefined => {
    if (item.sourceType === "EmployeeLoan") return byCategory("LoanRepayment");
    if (item.sourceType === "DisciplinaryPenalty") return byCategory("DisciplinaryPenalty");
    if (item.sourceType === "CourtOrder") return byCategory("CourtOrder");
    return item.componentId ? byId.get(item.componentId) : byCategory("Other");
  };
  const sourceOf: Record<ScheduleSource, PayslipLineSource> = { EmployeeLoan: "Loan", DisciplinaryPenalty: "Penalty", CourtOrder: "Input", Manual: "Input" };
  for (const s of schedule) {
    if (s.applied <= 0) continue;
    const component = componentForItem(s);
    if (!component) continue;
    pushLine(component, {
      amount: s.applied,
      source: sourceOf[s.sourceType],
      remark: s.deferred > 0 ? `${s.ref} (${fmt(s.applied)}/${fmt(s.amount)})` : s.ref,
    });
  }
  const otherDeductions = schedule.reduce((s, i) => s + i.applied, 0);
  const deferred = schedule.reduce((s, i) => s + i.deferred, 0);
  addStep("6", L("استقطاعات أخرى (قروض وعقوبات ومدخلات)", "Other deductions (loans, penalties, inputs)"), [
    ...items.map<TraceRow>((i) => ({ label: L(i.ref, i.ref), value: i.amount })),
    ...(items.length === 0 ? [{ label: L("لا توجد استقطاعات مستحقة", "Nothing due"), value: 0 }] : []),
  ]);
  addStep("6.5", L("حماية الصافي (السقف الشهري)", "Net protection (monthly cap)"), [
    { label: L("السقف", "Cap"), formula: `${fmt(grossPay)} × ${policy.maxMonthlyDeductionPercent}%`, value: Number.isFinite(cap) ? cap : "—" },
    { label: L("المطلوب استقطاعه", "Requested"), value: requested },
    { label: L("المستقطع فعلاً", "Applied"), value: otherDeductions },
    { label: L("المرحَّل للفترة التالية", "Carried forward"), value: deferred },
  ]);
  let netProtectionFlag: EngineResult["netProtectionFlag"] = null;
  if (blocked) {
    netProtectionFlag = "Blocked";
    warnings.push({
      severity: "Blocker",
      code: "NET_PROTECTION_BLOCK",
      amount: requested - cap,
      message: L(
        `الاستقطاعات (${fmt(requested)}) تتجاوز السقف الشهري (${fmt(cap)}) وسياسة الملف «إيقاف» — أجّل قسطاً أو عدّل المصدر`,
        `Deductions (${fmt(requested)}) exceed the monthly cap (${fmt(cap)}) and the profile policy is Block — defer an instalment or change the source`
      ),
    });
  } else if (overBreach) {
    netProtectionFlag = "Spread";
    warnings.push({
      severity: "Warning",
      code: "NET_PROTECTION_SPREAD",
      amount: deferred,
      message: L(
        `تجاوز السقف الشهري (${fmt(cap)}): رُحِّل ${fmt(deferred)} للفترة التالية`,
        `Monthly cap (${fmt(cap)}) exceeded: ${fmt(deferred)} carried to the next period`
      ),
    });
  }

  // ── 7 · totals ────────────────────────────────────────────────────────────────────────────────
  const totalEmployeeDeductions = employeeStatutory + incomeTax + otherDeductions;
  const netPay = grossPay - totalEmployeeDeductions;
  const employerCost = grossEarnings + employerContribution;
  addStep("7", L("المجاميع", "Totals"), [
    { label: L("إجمالي استقطاعات الموظف", "Employee deductions"), formula: `${fmt(employeeStatutory)} + ${fmt(incomeTax)} + ${fmt(otherDeductions)}`, value: totalEmployeeDeductions },
    { label: L("صافي الراتب", "Net pay"), formula: `${fmt(grossPay)} − ${fmt(totalEmployeeDeductions)}`, value: netPay },
    { label: L("كلفة صاحب العمل", "Employer cost"), formula: `${fmt(grossEarnings)} + ${fmt(employerContribution)}`, value: employerCost },
  ]);

  // ── 8 · rounding / attendance lines ───────────────────────────────────────────────────────────
  const absenceComp = byCategory("AbsenceDeduction");
  const latenessComp = byCategory("LatenessDeduction");
  if (absence > 0 && absenceComp) pushLine(absenceComp, { amount: absence, base: rate, quantity: time.absenceDays, source: "Attendance" });
  if (lateness > 0 && latenessComp) {
    pushLine(latenessComp, { amount: lateness, base: rate, quantity: time.lateEvents.filter((m) => m > policy.graceMinutes).length, source: "Attendance", remark: latenessDetail });
  }
  lines.sort((a, b) => a.sequence - b.sequence);
  addStep("8", L("التقريب", "Rounding"), [
    { label: L("قاعدة التقريب بالملف", "Profile rounding rule"), value: rounding },
    { label: L("تُقرَّب: الاستحقاقات النسبية والإضافي والتأمين والضريبة. خصم الغياب/التأخير بالدينار.", "Rounded: percentage pay, overtime, insurance, tax. Absence/lateness to the dinar."), value: "" },
  ]);

  // ── 9 · validation ────────────────────────────────────────────────────────────────────────────
  if (netPay < 0) {
    warnings.push({
      severity: "Blocker",
      code: "NEGATIVE_NET",
      amount: netPay,
      message: L(`صافي الراتب سالب (${fmt(netPay)})`, `Net pay is negative (${fmt(netPay)})`),
    });
  }
  addStep("9", L("التحقق", "Validation"), [
    { label: L("الصافي ≥ 0", "Net ≥ 0"), value: netPay >= 0 ? "✓" : "✗" },
    { label: L("الاستقطاعات ≤ السقف", "Deductions ≤ cap"), value: !overBreach ? "✓" : blocked ? "✗" : "↷" },
  ]);

  return {
    lines,
    grossEarnings,
    dayRate: rate,
    dayRateBasis: basis,
    absenceDeduction: absence,
    latenessDeduction: lateness,
    grossPay,
    pensionableBase,
    socialSecurityBase,
    taxableBase,
    taxableAfterExemptions,
    incomeTax,
    employeeStatutory,
    employerContribution,
    otherDeductions,
    totalEmployeeDeductions,
    netPay,
    employerCost,
    workedDays,
    schedule,
    netProtection: {
      cap: Number.isFinite(cap) ? cap : 0,
      requested,
      applied: otherDeductions,
      deferred,
      action: policy.overBreachAction,
      triggered: overBreach,
    },
    netProtectionFlag,
    warnings,
    trace,
    nominalSalary: resolved.step?.nominalSalary ?? null,
  };
}
