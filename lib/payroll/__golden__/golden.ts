import { calculatePayslip, type EngineDeductionItem, type EngineInput, type EngineResult, type EngineTime } from "@/lib/payroll/engine";
import { planSpread } from "@/lib/payroll/netProtection";
import { compensationFor } from "@/lib/payroll/run-calc";
import { buildPostingJournal } from "@/lib/payroll/run-journal";
import { roundTo, type ConfigBundle } from "@/lib/payroll/preview";
import { computeIncomeTax } from "@/lib/payroll/tax";
import type {
  EmployeeCompensation,
  EmployeeCompensationComponent,
  GlAccount,
  LocalizedText,
  Payslip,
  PayslipLineRecord,
} from "@/lib/payroll/types";

// The study's worked examples (12.1 – 12.4) as executable checks of the calculation engine (spec §6).
// Every check carries up to three numbers:
//   study    – the figure printed in the study;
//   expected – what the documented rules (profile rounding to 250, illustrative tax brackets) must give;
//   actual   – what the engine produced.
// A check passes when actual = expected. When expected ≠ study the difference is a known, documented gap
// (G2: the study's tax figures are inconsistent with any bracket table; G3: rounding of overtime / insurance).

export type GoldenStatus = "match" | "documented" | "fail";

export type GoldenCheck = {
  id: string;
  label: LocalizedText;
  study: number | null;
  expected: number;
  actual: number;
  status: GoldenStatus;
  note?: LocalizedText;
};

export type GoldenScenario = {
  id: "12.1" | "12.2" | "12.3" | "12.4";
  title: LocalizedText;
  description: LocalizedText;
  employeeId: string;
  checks: GoldenCheck[];
  passed: boolean;
};

export type GoldenData = {
  bundle: ConfigBundle;
  compensations: EmployeeCompensation[];
  overrides: EmployeeCompensationComponent[];
  accounts: GlAccount[];
};

const L = (ar: string, en: string): LocalizedText => ({ ar, en });
const G2 = L("فجوة G2: ضريبة الدراسة لا تتسق مع أي جدول شرائح — تُتحقق من معادلة الشرائح المخزّنة", "Gap G2: the study's tax figure is inconsistent with any bracket table — verified against the stored brackets");
const G3 = L("فجوة G3: تقريب الأجر لأقرب 250 (قرار #10) بدل تقريب الدراسة", "Gap G3: wages rounded to the nearest 250 (decision #10) instead of the study's rounding");

const PERIOD = { key: "2026-10", start: "2026-10-01", end: "2026-10-31" };
const FULL_TIME: EngineTime = { workingDays: 26, calendarDays: 31, absenceDays: 0, lateEvents: [], lwpDays: 0, paidLeaveDays: 0, overtimeHours: 0, coverageDays: 31, hasAttendanceData: true };

function check(id: string, label: LocalizedText, study: number | null, expected: number, actual: number, note?: LocalizedText): GoldenCheck {
  const status: GoldenStatus = actual !== expected ? "fail" : study === null || study === expected ? "match" : "documented";
  return { id, label, study, expected, actual, status, note: status === "documented" ? note : undefined };
}

function inputFor(data: GoldenData, employeeId: string, time: EngineTime, deductionItems: EngineDeductionItem[], periodKey = PERIOD.key, start = PERIOD.start, end = PERIOD.end): EngineInput {
  const comp = compensationFor(data.compensations, employeeId, start, end);
  if (!comp) throw new Error(`Golden: ${employeeId} has no compensation in ${periodKey}`);
  return {
    periodKey,
    periodEnd: end,
    compensation: {
      profileId: comp.profileId,
      salaryStructureId: comp.salaryStructureId,
      gradeStepId: comp.gradeStepId,
      baseSalary: comp.baseSalary,
      taxMaritalStatus: comp.taxMaritalStatus,
      eligibleChildrenCount: comp.eligibleChildrenCount,
      isPensionExempt: comp.isPensionExempt,
      overrides: data.overrides.filter((o) => o.compensationId === comp.id),
    },
    bundle: data.bundle,
    time,
    earningInputs: [],
    deductionItems,
  };
}

const lineAmount = (r: EngineResult, code: string) => r.lines.find((l) => l.componentCode === code)?.amount ?? 0;

/** Tax recomputed independently from the stored brackets (not through the engine). */
function expectedTax(data: GoldenData, profileId: string, taxableBase: number, married: boolean, children: number, end: string) {
  const cfg = data.bundle.taxConfigs.find((t) => t.profileId === profileId && t.effectiveFrom <= end && (!t.effectiveTo || t.effectiveTo >= end));
  if (!cfg) return { tax: 0, afterExemptions: 0 };
  const r = computeIncomeTax(taxableBase, cfg, { married, children, ageOver63: false, disability: false });
  return { tax: roundTo(r.tax, 250), afterExemptions: Math.round(r.taxableAfterExemptions) };
}

export function runGolden(data: GoldenData): GoldenScenario[] {
  const scenarios: GoldenScenario[] = [];
  const names = Object.fromEntries(data.accounts.map((a) => [a.code, a.name]));

  // ── 12.1 government employee: grade 7 / step 3 ───────────────────────────────────────────────
  {
    const r = calculatePayslip(inputFor(data, "emp-007", FULL_TIME, [{ sourceType: "EmployeeLoan", sourceId: "golden", ref: "LN-2026-0001", amount: 100_000 }]));
    const comp = compensationFor(data.compensations, "emp-007", PERIOD.start, PERIOD.end)!;
    const tax = expectedTax(data, comp.profileId, 789_000, comp.taxMaritalStatus === "Married", comp.eligibleChildrenCount, PERIOD.end);
    const checks = [
      check("gross", L("إجمالي الاستحقاقات", "Gross earnings"), 920_000, 920_000, r.grossEarnings),
      check("pensionBase", L("وعاء التقاعد", "Pensionable base"), 710_000, 710_000, r.pensionableBase),
      check("pension", L("تقاعد الموظف (10٪)", "Employee pension (10%)"), 71_000, 71_000, lineAmount(r, "PENSION_EMPLOYEE")),
      check("taxBase", L("الوعاء الضريبي", "Taxable base"), 789_000, 789_000, r.taxableBase),
      check("taxAfterExemptions", L("الوعاء بعد الإعفاءات", "Taxable after exemptions"), 164_000, tax.afterExemptions, r.taxableAfterExemptions),
      check("incomeTax", L("ضريبة الدخل", "Income tax"), 5_600, tax.tax, r.incomeTax, G2),
      check("loan", L("قسط القرض", "Loan instalment"), 100_000, 100_000, lineAmount(r, "LOAN_REPAYMENT")),
      check("employerContribution", L("مساهمة الدولة (15٪)", "State contribution (15%)"), 106_500, 106_500, r.employerContribution),
      check("employerCost", L("كلفة صاحب العمل", "Employer cost"), 1_026_500, 1_026_500, r.employerCost),
      check("net", L("صافي الراتب", "Net pay"), null, 920_000 - 71_000 - tax.tax - 100_000, r.netPay),
    ];
    scenarios.push({
      id: "12.1",
      title: L("12.1 موظف حكومي — الدرجة 7 / المرحلة 3", "12.1 Government employee — grade 7 / step 3"),
      description: L("620,000 + علاوة 45,000 + شهادة 45,000 + منصب 150,000 + زوجية 30,000 + أطفال 30,000، وقسط قرض 100,000", "620,000 + increment 45,000 + certificate 45,000 + position 150,000 + spouse 30,000 + children 30,000, with a 100,000 loan instalment"),
      employeeId: "emp-007",
      checks,
      passed: checks.every((c) => c.status !== "fail"),
    });
  }

  // ── 12.2 private employee with overtime + 12.3 its journal ────────────────────────────────────
  {
    const time = { ...FULL_TIME, overtimeHours: 10 };
    const input = inputFor(data, "emp-008", time, [{ sourceType: "EmployeeLoan", sourceId: "golden", ref: "LN-2026-0002", amount: 150_000 }]);
    const r = calculatePayslip(input);
    const comp = compensationFor(data.compensations, "emp-008", PERIOD.start, PERIOD.end)!;
    const overtime = roundTo(10 * (900_000 / 192) * 1.5, 250);
    const gross = 900_000 + 200_000 + 100_000 + overtime;
    const ssBase = 900_000 + 200_000 + overtime;
    const ssEmployee = roundTo((ssBase * 5) / 100, 250);
    const ssEmployer = roundTo((ssBase * 12) / 100, 250);
    const taxBase = 900_000 + 200_000 + overtime - ssEmployee;
    const tax = expectedTax(data, comp.profileId, taxBase, comp.taxMaritalStatus === "Married", comp.eligibleChildrenCount, PERIOD.end);
    const checks = [
      check("overtime", L("العمل الإضافي (10 ساعات)", "Overtime (10 hours)"), 70_300, overtime, lineAmount(r, "OVERTIME"), G3),
      check("gross", L("إجمالي الاستحقاقات", "Gross earnings"), 1_270_300, gross, r.grossEarnings, G3),
      check("ssBase", L("وعاء الضمان", "Social-security base"), 1_170_300, ssBase, r.socialSecurityBase, G3),
      check("ssEmployee", L("ضمان الموظف (5٪)", "Employee social security (5%)"), 58_515, ssEmployee, lineAmount(r, "SOCIAL_SECURITY_EMPLOYEE"), G3),
      check("ssEmployer", L("ضمان صاحب العمل (12٪)", "Employer social security (12%)"), 140_436, ssEmployer, lineAmount(r, "SOCIAL_SECURITY_EMPLOYER"), G3),
      check("taxBase", L("الوعاء الضريبي", "Taxable base"), 1_111_785, taxBase, r.taxableBase, G3),
      check("incomeTax", L("ضريبة الدخل", "Income tax"), 21_900, tax.tax, r.incomeTax, G2),
      check("loan", L("قسط القرض", "Loan instalment"), 150_000, 150_000, lineAmount(r, "LOAN_REPAYMENT")),
      check("employerCost", L("كلفة صاحب العمل", "Employer cost"), 1_410_736, gross + ssEmployer, r.employerCost, G3),
    ];
    scenarios.push({
      id: "12.2",
      title: L("12.2 موظف خاص — أساسي 900,000 + إضافي", "12.2 Private employee — basic 900,000 + overtime"),
      description: L("أساسي 900,000 + سكن 200,000 + نقل 100,000 + 10 ساعات إضافي، وقسط قرض 150,000", "Basic 900,000 + housing 200,000 + transport 100,000 + 10 overtime hours, with a 150,000 loan instalment"),
      employeeId: "emp-008",
      checks,
      passed: checks.every((c) => c.status !== "fail"),
    });

    // 12.3 — the journal of 12.2
    const payslip = {
      id: "golden-ps", costCenterId: comp.costCenterId, netPay: r.netPay, paymentMethod: comp.paymentMethod,
    } as Payslip;
    const lines = r.lines.map((l, i) => ({ ...l, id: `g${i}`, payslipId: "golden-ps" })) as PayslipLineRecord[];
    const journal = buildPostingJournal({ run: { id: "golden", runNo: "GOLDEN", periodKey: PERIOD.key }, payslips: [payslip], lines, names, journalRef: "JV-GOLDEN" });
    const debit = journal.reduce((s, l) => s + l.debit, 0);
    const credit = journal.reduce((s, l) => s + l.credit, 0);
    const credited = (code: string) => journal.filter((l) => l.accountCode === code).reduce((s, l) => s + l.credit, 0);
    const jchecks = [
      check("debit", L("إجمالي المدين", "Total debit"), 1_410_736, gross + ssEmployer, debit, G3),
      check("balance", L("المدين − الدائن", "Debit − credit"), 0, 0, debit - credit),
      check("socialSecurityPayable", L("دائن: الضمان المستحق", "Credit: social security payable"), 198_951, ssEmployee + ssEmployer, credited("2230"), G3),
      check("loanCredit", L("دائن: سلف الموظفين", "Credit: employee loans"), 150_000, 150_000, credited("1150")),
      check("taxPayable", L("دائن: ضريبة الدخل", "Credit: income tax"), null, r.incomeTax, credited("2210")),
      check("netPayable", L("دائن: رواتب مستحقة (الصافي)", "Credit: net salaries payable"), null, r.netPay, credited("2250")),
    ];
    scenarios.push({
      id: "12.3",
      title: L("12.3 القيد المحاسبي للمثال 12.2", "12.3 Journal entry of example 12.2"),
      description: L("مدين المصروفات + مساهمة صاحب العمل = دائن الذمم + الصافي", "Debit expenses + employer contribution = credit payables + net"),
      employeeId: "emp-008",
      checks: jchecks,
      passed: jchecks.every((c) => c.status !== "fail"),
    });
  }

  // ── 12.4 absence, lateness and a penalty ─────────────────────────────────────────────────────
  {
    const time: EngineTime = { workingDays: 26, calendarDays: 30, absenceDays: 2, lateEvents: [20, 25, 18], lwpDays: 0, paidLeaveDays: 0, overtimeHours: 0, coverageDays: 30, hasAttendanceData: true };
    const r = calculatePayslip(
      inputFor(data, "emp-011", time, [{ sourceType: "DisciplinaryPenalty", sourceId: "golden", ref: "PEN-2026-0001", amount: 173_075 }], "2026-09", "2026-09-01", "2026-09-30")
    );
    const cap = Math.round((778_847 * 25) / 100);
    const plan = planSpread({ amount: 900_000, type: "OneMonthSalary", requestedMonths: 1, startPeriodId: "2026-11", capacityOf: () => cap, action: "AutoSpread" });
    const checks = [
      check("dayRate", L("معدّل اليوم", "Day rate"), 34_615, 34_615, r.dayRate),
      check("absence", L("خصم الغياب (يومان)", "Absence deduction (2 days)"), 69_230, 69_230, r.absenceDeduction),
      check("lateness", L("خصم التأخير (3 أحداث)", "Lateness deduction (3 events)"), 51_923, 51_923, r.latenessDeduction),
      check("grossPay", L("الإجمالي بعد الخصم", "Gross after deductions"), null, 778_847, r.grossPay),
      check("penalty", L("العقوبة (5 أيام) ضمن السقف", "Penalty (5 days) within the cap"), 173_075, 173_075, lineAmount(r, "DISCIPLINARY_PENALTY"),
        L("السقف 194,712 (25٪ من الإجمالي بعد الخصم)", "Cap is 194,712 (25% of gross after deductions)")),
      check("cap", L("السقف الشهري", "Monthly cap"), 200_000, cap, r.netProtection.cap,
        L("الدراسة تقرّب السقف إلى 200,000", "The study rounds the cap to 200,000")),
      check("spreadMonths", L("عقوبة راتب شهر: عدد الأقساط", "One-month-salary penalty: instalments"), 5, 5, plan.months),
      check("spreadAmount", L("قيمة القسط", "Instalment amount"), 180_000, 180_000, plan.rows[0]?.amount ?? 0),
    ];
    scenarios.push({
      id: "12.4",
      title: L("12.4 غياب وتأخير وعقوبة", "12.4 Absence, lateness and a penalty"),
      description: L("أساسي 900,000 · 26 يوماً · غياب 2 · تأخير 3 أحداث (20/25/18 دقيقة) · عقوبة 5 أيام", "Basic 900,000 · 26 days · 2 absent · 3 late arrivals (20/25/18 min) · a 5-day penalty"),
      employeeId: "emp-011",
      checks,
      passed: checks.every((c) => c.status !== "fail"),
    });
  }

  return scenarios;
}
