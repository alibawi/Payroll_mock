// One-off generator for mock-data/payroll config seed files (components, profiles, structures, grade
// scale, tax / pension / social-security configs, GL accounts, activity log). Run: node scripts/gen-config-data.js
// All legal figures are illustrative (study 4/5, roadmap G1/G2/G7) and editable from the UI.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "mock-data", "payroll") + path.sep;
fs.mkdirSync(out, { recursive: true });
const w = (f, d) => fs.writeFileSync(out + f, JSON.stringify(d, null, 2) + "\n");
const L = (ar, en) => ({ ar, en });

// ---- GL accounts (placeholder for the Finance chart of accounts) ----
const gl = [
  ["1110", "النقد في الصندوق", "Cash on hand", "Asset"],
  ["1120", "المصرف — الحساب الجاري", "Bank — current account", "Asset"],
  ["1150", "قروض وسلف الموظفين المدينة", "Employee loans & advances receivable", "Asset"],
  ["2210", "أمانات ضريبة الدخل", "Income tax payable", "Liability"],
  ["2220", "أمانات التقاعد", "Pension contributions payable", "Liability"],
  ["2230", "أمانات الضمان الاجتماعي", "Social security payable", "Liability"],
  ["2240", "اقتطاعات قضائية مستحقة التوريد", "Court orders payable", "Liability"],
  ["2250", "رواتب مستحقة الدفع", "Net salaries payable", "Liability"],
  ["2260", "أمانات رسوم النقابة", "Union dues payable", "Liability"],
  ["4310", "إيراد الغرامات والعقوبات", "Penalties & fines income", "Revenue"],
  ["5110", "مصروف الرواتب والأجور", "Salaries & wages expense", "Expense"],
  ["5120", "مصروف حصة صاحب العمل — التقاعد", "Employer pension expense", "Expense"],
  ["5130", "مصروف حصة صاحب العمل — الضمان", "Employer social security expense", "Expense"],
  ["5140", "مصروف العمل الإضافي", "Overtime expense", "Expense"],
  ["5190", "مصروفات رواتب أخرى", "Other payroll expenses", "Expense"],
].map(([code, ar, en, type]) => ({ id: "gl-" + code, code, name: L(ar, en), type }));
w("gl-accounts.json", gl);

// ---- Components ----
// [code, ar, en, type, category, method, percent, bases, taxable, pensionable, ssBase, prorate, reducesGross, expense, payable, active]
const E = "Earning", D = "Deduction", ER = "EmployerContribution", I = "Informational";
const raw = [
  // Government earnings (study 4.3)
  ["NOMINAL_SALARY", "الراتب الاسمي", "Nominal salary", E, "Basic", "FixedAmount", null, [], 1, 1, 0, 1, 0, "5110", null, 1],
  ["ANNUAL_INCREMENT", "العلاوة السنوية", "Annual increment", E, "Basic", "FixedAmount", null, [], 1, 1, 0, 1, 0, "5110", null, 1],
  ["CERT_ALLOWANCE", "مخصصات الشهادة", "Certificate allowance", E, "Allowance", "FixedAmount", null, [], 1, 1, 0, 1, 0, "5110", null, 1],
  ["POSITION_ALLOWANCE", "مخصصات المنصب", "Position allowance", E, "Allowance", "FixedAmount", null, [], 1, 0, 0, 1, 0, "5110", null, 1],
  ["SPOUSE_ALLOWANCE", "مخصصات الزوجية", "Spouse allowance", E, "Allowance", "FixedAmount", null, [], 0, 0, 0, 1, 0, "5110", null, 1],
  ["CHILD_ALLOWANCE", "مخصصات الأطفال", "Children allowance", E, "Allowance", "FixedAmount", null, [], 0, 0, 0, 1, 0, "5110", null, 1],
  ["HAZARD_ALLOWANCE_GOV", "مخصصات الخطورة (حكومي)", "Hazard allowance (govt)", E, "Allowance", "PercentOfBase", 15, ["NOMINAL_SALARY"], 1, 0, 0, 1, 0, "5110", null, 1],
  ["PROFESSION_ALLOWANCE", "مخصصات المهنة والاختصاص", "Profession allowance", E, "Allowance", "PercentOfBase", 25, ["NOMINAL_SALARY"], 1, 0, 0, 1, 0, "5110", null, 1],
  ["TRANSPORT_ALLOWANCE_GOV", "مخصصات النقل (حكومي)", "Transport allowance (govt)", E, "Allowance", "FixedAmount", null, [], 0, 0, 0, 1, 0, "5110", null, 1],
  ["REMOTE_ALLOWANCE", "مخصصات الموقع والمنطقة النائية", "Remote-area allowance", E, "Allowance", "PercentOfBase", 10, ["NOMINAL_SALARY"], 1, 0, 0, 1, 0, "5110", null, 1],
  ["OVERTIME_GOV", "بدل العمل الإضافي والمناوبات (حكومي)", "Overtime & shifts (govt)", E, "Overtime", "AttendanceDriven", null, ["NOMINAL_SALARY"], 1, 0, 0, 0, 0, "5140", null, 0],
  // Private earnings (study 5.2)
  ["BASIC_SALARY", "الأجر الأساسي", "Basic salary", E, "Basic", "FixedAmount", null, [], 1, 0, 1, 1, 0, "5110", null, 1],
  ["HOUSING_ALLOWANCE", "بدل سكن", "Housing allowance", E, "Allowance", "FixedAmount", null, [], 1, 0, 1, 1, 0, "5110", null, 1],
  ["TRANSPORT_ALLOWANCE_PRIV", "بدل نقل", "Transport allowance", E, "Allowance", "FixedAmount", null, [], 0, 0, 0, 1, 0, "5110", null, 1],
  ["FOOD_ALLOWANCE", "بدل طعام", "Food allowance", E, "Allowance", "FixedAmount", null, [], 1, 0, 0, 1, 0, "5110", null, 1],
  ["PHONE_ALLOWANCE", "بدل هاتف", "Phone allowance", E, "Allowance", "FixedAmount", null, [], 1, 0, 0, 1, 0, "5110", null, 1],
  ["NATURE_OF_WORK_ALLOWANCE", "بدل طبيعة عمل", "Nature-of-work allowance", E, "Allowance", "FixedAmount", null, [], 1, 0, 1, 1, 0, "5110", null, 1],
  ["HAZARD_ALLOWANCE_PRIV", "بدل خطورة (خاص)", "Hazard allowance (private)", E, "Allowance", "PercentOfBase", 10, ["BASIC_SALARY"], 1, 0, 1, 1, 0, "5110", null, 1],
  ["OVERTIME", "العمل الإضافي", "Overtime", E, "Overtime", "AttendanceDriven", null, ["BASIC_SALARY"], 1, 0, 1, 0, 0, "5140", null, 1],
  ["BONUS", "مكافأة", "Bonus", E, "Bonus", "Manual", null, [], 1, 0, 0, 0, 0, "5110", null, 1],
  // Deductions
  ["PENSION_EMPLOYEE", "التوقيفات التقاعدية — حصة الموظف", "Pension — employee share", D, "StatutoryPension", "PercentOfBase", 10, ["NOMINAL_SALARY", "ANNUAL_INCREMENT", "CERT_ALLOWANCE"], 0, 0, 0, 0, 0, null, "2220", 1],
  ["SOCIAL_SECURITY_EMPLOYEE", "الضمان الاجتماعي — حصة العامل", "Social security — employee share", D, "StatutorySocialSecurity", "PercentOfBase", 5, ["BASIC_SALARY", "HOUSING_ALLOWANCE", "NATURE_OF_WORK_ALLOWANCE", "HAZARD_ALLOWANCE_PRIV", "OVERTIME"], 0, 0, 0, 0, 0, null, "2230", 1],
  ["INCOME_TAX", "ضريبة الدخل", "Income tax", D, "IncomeTax", "RateTable", null, [], 0, 0, 0, 0, 0, null, "2210", 1],
  ["LOAN_REPAYMENT", "قسط قرض / سلفة", "Loan / advance instalment", D, "LoanRepayment", "Manual", null, [], 0, 0, 0, 0, 0, null, "1150", 1],
  ["UNION_DUES", "رسوم النقابة", "Union dues", D, "UnionDues", "PercentOfBase", 1, ["NOMINAL_SALARY"], 0, 0, 0, 0, 0, null, "2260", 1],
  ["ABSENCE_DEDUCTION", "خصم الغياب", "Absence deduction", D, "AbsenceDeduction", "AttendanceDriven", null, [], 0, 0, 0, 0, 1, "5110", null, 1],
  ["LATENESS_DEDUCTION", "خصم التأخير", "Lateness deduction", D, "LatenessDeduction", "AttendanceDriven", null, [], 0, 0, 0, 0, 1, "5110", null, 1],
  ["DISCIPLINARY_PENALTY", "عقوبة تأديبية", "Disciplinary penalty", D, "DisciplinaryPenalty", "Manual", null, [], 0, 0, 0, 0, 0, null, "4310", 1],
  ["COURT_ORDER", "اقتطاع قضائي / نفقة", "Court order / alimony", D, "CourtOrder", "Manual", null, [], 0, 0, 0, 0, 0, null, "2240", 1],
  ["OTHER_DEDUCTION", "استقطاعات أخرى", "Other deductions", D, "Other", "Manual", null, [], 0, 0, 0, 0, 0, null, "5190", 1],
  // Employer contributions
  ["PENSION_EMPLOYER", "حصة الدولة — التقاعد", "Pension — employer share", ER, "StatutoryPension", "PercentOfBase", 15, ["NOMINAL_SALARY", "ANNUAL_INCREMENT", "CERT_ALLOWANCE"], 0, 0, 0, 0, 0, "5120", "2220", 1],
  ["SOCIAL_SECURITY_EMPLOYER", "الضمان الاجتماعي — حصة صاحب العمل", "Social security — employer share", ER, "StatutorySocialSecurity", "PercentOfBase", 12, ["BASIC_SALARY", "HOUSING_ALLOWANCE", "NATURE_OF_WORK_ALLOWANCE", "HAZARD_ALLOWANCE_PRIV", "OVERTIME"], 0, 0, 0, 0, 0, "5130", "2230", 1],
  // Informational
  ["TAXABLE_BASE", "الوعاء الضريبي (معلوماتي)", "Taxable base (informational)", I, "Other", "Formula", null, [], 0, 0, 0, 0, 0, null, null, 1],
];
const idOf = {};
const components = raw.map((r, i) => {
  const [code, ar, en, componentType, category, calculationMethod, percentValue, baseComponentCodes, tx, pn, ss, pr, rg, exp, pay, act] = r;
  const id = "pc-" + String(i + 1).padStart(2, "0");
  idOf[code] = id;
  return {
    id, code, name: L(ar, en), componentType, category, calculationMethod,
    percentValue, baseComponentCodes,
    isTaxable: !!tx, isPensionable: !!pn, isSocialSecurityBase: !!ss, isProratable: !!pr, reducesGross: !!rg,
    expenseAccountCode: exp, payableAccountCode: pay, sequence: (i + 1) * 10, isActive: !!act,
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-01-05T08:30:00Z",
  };
});
w("components.json", components);

// ---- Profiles ----
const tiers = [
  { id: "t1", fromMinutes: 1, toMinutes: 15, dayFraction: 0.25 },
  { id: "t2", fromMinutes: 16, toMinutes: 30, dayFraction: 0.5 },
  { id: "t3", fromMinutes: 31, toMinutes: 60, dayFraction: 0.75 },
  { id: "t4", fromMinutes: 61, toMinutes: null, dayFraction: 1 },
];
const policy = (absCodes) => ({
  graceMinutes: 10, latenessMethod: "Tiers", latenessTiers: tiers, latenessRatePerMinute: null,
  maxLateEventsBeforeDayCut: null, absenceDayRateComponentCodes: absCodes,
  maxMonthlyDeductionPercent: 25, overBreachAction: "AutoSpread",
});
w("profiles.json", [
  {
    id: "pf-gov", code: "GOVERNMENT_IQ", name: L("القطاع الحكومي — العراق", "Iraq — Government sector"),
    description: L("السلّم الوظيفي (درجة/مرحلة) + التقاعد الموحّد + ضريبة الدخل", "Grade/step scale + unified pension + income tax"),
    enablePension: true, enableSocialSecurity: false, enableIncomeTax: true, payFrequency: "Monthly",
    roundingRule: 250, currencyCode: "IQD", cutoffDay: 25,
    overtimeMultiplierNormal: 1.5, overtimeMultiplierRest: 2, overtimeMultiplierHoliday: 2, dayRateBasis: "WorkingDays",
    attendancePenaltyPolicy: policy(["NOMINAL_SALARY", "ANNUAL_INCREMENT"]), isActive: true,
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-03-12T10:05:00Z",
  },
  {
    id: "pf-priv", code: "PRIVATE_IQ", name: L("القطاع الخاص — العراق", "Iraq — Private sector"),
    description: L("الأجر التعاقدي + الضمان الاجتماعي للعمال + ضريبة الدخل", "Contractual wage + workers' social security + income tax"),
    enablePension: false, enableSocialSecurity: true, enableIncomeTax: true, payFrequency: "Monthly",
    roundingRule: 250, currencyCode: "IQD", cutoffDay: 28,
    overtimeMultiplierNormal: 1.5, overtimeMultiplierRest: 2, overtimeMultiplierHoliday: 2, dayRateBasis: "WorkingDays",
    attendancePenaltyPolicy: policy(["BASIC_SALARY"]), isActive: true,
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-02-18T13:40:00Z",
  },
]);

// ---- Salary structures ----
let ln = 0;
const line = (code, seq, extra) => ({
  id: "sl-" + String(++ln).padStart(3, "0"), componentId: idOf[code],
  overrideMethod: null, overrideAmount: null, overridePercent: null,
  overrideExpenseAccountCode: null, overridePayableAccountCode: null, sequence: seq, ...(extra || {}),
});
const mk = (codes) => codes.map((c, i) => (Array.isArray(c) ? line(c[0], (i + 1) * 10, c[1]) : line(c, (i + 1) * 10)));
const common = ["INCOME_TAX", "LOAN_REPAYMENT", "ABSENCE_DEDUCTION", "LATENESS_DEDUCTION", "DISCIPLINARY_PENALTY", "COURT_ORDER"];
w("structures.json", [
  {
    id: "st-gov-2026", code: "GOV_STANDARD", name: L("هيكل حكومي قياسي", "Standard government structure"), profileId: "pf-gov",
    effectiveFrom: "2026-01-01", effectiveTo: null, isActive: true,
    lines: mk([
      "NOMINAL_SALARY", ["ANNUAL_INCREMENT", { overrideAmount: 15000 }], ["CERT_ALLOWANCE", { overrideAmount: 45000 }],
      ["POSITION_ALLOWANCE", { overrideAmount: 150000 }], ["SPOUSE_ALLOWANCE", { overrideAmount: 30000 }],
      ["CHILD_ALLOWANCE", { overrideAmount: 10000 }], ["TRANSPORT_ALLOWANCE_GOV", { overrideAmount: 50000 }],
      "HAZARD_ALLOWANCE_GOV", "PROFESSION_ALLOWANCE", "REMOTE_ALLOWANCE",
      "PENSION_EMPLOYEE", "UNION_DUES", ...common, "PENSION_EMPLOYER",
    ]),
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-03-12T10:05:00Z",
  },
  {
    id: "st-gov-2024", code: "GOV_STANDARD_2024", name: L("هيكل حكومي قياسي (نسخة 2024)", "Standard government structure (2024)"), profileId: "pf-gov",
    effectiveFrom: "2024-01-01", effectiveTo: "2025-12-31", isActive: false,
    lines: mk([
      "NOMINAL_SALARY", ["ANNUAL_INCREMENT", { overrideAmount: 12000 }], ["CERT_ALLOWANCE", { overrideAmount: 40000 }],
      ["POSITION_ALLOWANCE", { overrideAmount: 120000 }], ["SPOUSE_ALLOWANCE", { overrideAmount: 30000 }],
      ["CHILD_ALLOWANCE", { overrideAmount: 10000 }], "PENSION_EMPLOYEE", "INCOME_TAX", "LOAN_REPAYMENT",
      "ABSENCE_DEDUCTION", "LATENESS_DEDUCTION", "PENSION_EMPLOYER",
    ]),
    createdAt: "2024-01-03T09:00:00Z", updatedAt: "2025-12-31T16:00:00Z",
  },
  {
    id: "st-priv-admin", code: "PRIV_ADMIN", name: L("هيكل خاص — إدارة", "Private structure — administration"), profileId: "pf-priv",
    effectiveFrom: "2026-01-01", effectiveTo: null, isActive: true,
    lines: mk([
      "BASIC_SALARY", "HOUSING_ALLOWANCE", ["TRANSPORT_ALLOWANCE_PRIV", { overrideAmount: 100000 }], ["PHONE_ALLOWANCE", { overrideAmount: 25000 }],
      "OVERTIME", "BONUS", "SOCIAL_SECURITY_EMPLOYEE", ...common, "OTHER_DEDUCTION", "SOCIAL_SECURITY_EMPLOYER",
    ]),
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-02-18T13:40:00Z",
  },
  {
    id: "st-priv-workers", code: "PRIV_WORKERS", name: L("هيكل خاص — عمال", "Private structure — workers"), profileId: "pf-priv",
    effectiveFrom: "2026-01-01", effectiveTo: null, isActive: true,
    lines: mk([
      "BASIC_SALARY", "HOUSING_ALLOWANCE", ["TRANSPORT_ALLOWANCE_PRIV", { overrideAmount: 100000 }], ["FOOD_ALLOWANCE", { overrideAmount: 50000 }],
      ["HAZARD_ALLOWANCE_PRIV", { overridePercent: 12 }], ["NATURE_OF_WORK_ALLOWANCE", { overrideAmount: 40000 }], "OVERTIME",
      "SOCIAL_SECURITY_EMPLOYEE", ...common, "SOCIAL_SECURITY_EMPLOYER",
    ]),
    createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-04-02T11:20:00Z",
  },
]);

// ---- Government grade scale (10 grades x 11 steps; grade 7 / step 3 = 620,000 — study 12.1) ----
const gradeBase = { 1: [1450000, 45000], 2: [1250000, 40000], 3: [1080000, 35000], 4: [930000, 30000], 5: [800000, 25000],
  6: [690000, 20000], 7: [590000, 15000], 8: [500000, 12000], 9: [420000, 10000], 10: [350000, 8000] };
const steps = [];
for (let g = 1; g <= 10; g++) {
  for (let s = 1; s <= 11; s++) {
    const [base, inc] = gradeBase[g];
    steps.push({ id: "gs-" + g + "-" + s, grade: g, step: s, nominalSalary: base + (s - 1) * inc, annualIncrementAmount: inc });
  }
}
w("grade-scales.json", [{
  id: "gsc-2026", code: "GOV_SCALE_2026", name: L("سلّم رواتب موظفي الدولة 2026", "State employees salary scale 2026"),
  profileId: "pf-gov", effectiveFrom: "2026-01-01", effectiveTo: null, isActive: true, steps,
  createdAt: "2026-01-05T08:30:00Z", updatedAt: "2026-03-12T10:05:00Z",
}]);

// ---- Tax configs (illustrative brackets — roadmap G1/G2) ----
const brackets = [
  { id: "b1", fromAmount: 0, toAmount: 250000, rate: 3 },
  { id: "b2", fromAmount: 250000, toAmount: 500000, rate: 5 },
  { id: "b3", fromAmount: 500000, toAmount: 1000000, rate: 10 },
  { id: "b4", fromAmount: 1000000, toAmount: null, rate: 15 },
];
const ex = (p, m, c, a, d) => [
  { id: "e1", kind: "Personal", annualAmount: p }, { id: "e2", kind: "Married", annualAmount: m },
  { id: "e3", kind: "PerChild", annualAmount: c }, { id: "e4", kind: "AgeOver63", annualAmount: a },
  { id: "e5", kind: "Disability", annualAmount: d },
];
const tax = (id, profileId, from, to, exemptions, notes) => ({
  id, profileId, effectiveFrom: from, effectiveTo: to, calcBasis: "MonthlyDirect", currencyCode: "IQD",
  brackets, exemptions, notes, createdAt: (from > "2026-09-10" ? "2026-09-10" : from) + "T08:00:00Z",
});
w("tax-configs.json", [
  tax("tx-gov-2024", "pf-gov", "2024-01-01", "2025-12-31", ex(2500000, 1250000, 800000, 1000000, 1500000), L("إعفاءات 2024", "2024 exemptions")),
  tax("tx-gov-2026", "pf-gov", "2026-01-01", null, ex(3000000, 1500000, 1000000, 1000000, 1500000), L("تحديث الإعفاءات لعام 2026", "2026 exemption update")),
  tax("tx-priv-2024", "pf-priv", "2024-01-01", "2025-12-31", ex(2500000, 1250000, 800000, 1000000, 1500000), L("إعفاءات 2024", "2024 exemptions")),
  tax("tx-priv-2026", "pf-priv", "2026-01-01", "2026-12-31", ex(3000000, 1500000, 1000000, 1000000, 1500000), L("تحديث الإعفاءات لعام 2026", "2026 exemption update")),
  tax("tx-priv-2027", "pf-priv", "2027-01-01", null, ex(3500000, 1750000, 1000000, 1000000, 1500000), L("إعفاءات مقترحة لعام 2027", "Proposed 2027 exemptions")),
]);

// ---- Pension (government) ----
w("pension-configs.json", [
  { id: "pn-2019", profileId: "pf-gov", effectiveFrom: "2019-01-01", effectiveTo: "2025-12-31", employeeRate: 10, employerRate: 15,
    baseComponentCodes: ["NOMINAL_SALARY", "ANNUAL_INCREMENT"], employeePayableAccountCode: "2220", employerExpenseAccountCode: "5120", employerPayableAccountCode: "2220",
    notes: L("قانون التقاعد الموحّد 9/2014", "Unified Pension Law 9/2014"), createdAt: "2019-01-02T08:00:00Z" },
  { id: "pn-2026", profileId: "pf-gov", effectiveFrom: "2026-01-01", effectiveTo: null, employeeRate: 10, employerRate: 15,
    baseComponentCodes: ["NOMINAL_SALARY", "ANNUAL_INCREMENT", "CERT_ALLOWANCE"], employeePayableAccountCode: "2220", employerExpenseAccountCode: "5120", employerPayableAccountCode: "2220",
    notes: L("إضافة مخصصات الشهادة إلى الوعاء التقاعدي", "Certificate allowance added to the pensionable base"), createdAt: "2026-01-05T08:30:00Z" },
]);

// ---- Social security (private) ----
const hazard = (rate) => [{ id: "ao1", activity: L("الأنشطة الخطرة (إنشاءات / مصانع)", "Hazardous activities (construction / plants)"), employerRate: rate }];
const ssBases = ["BASIC_SALARY", "HOUSING_ALLOWANCE", "NATURE_OF_WORK_ALLOWANCE", "HAZARD_ALLOWANCE_PRIV", "OVERTIME"];
w("social-security-configs.json", [
  { id: "ss-2015", profileId: "pf-priv", effectiveFrom: "2015-01-01", effectiveTo: "2023-12-31", employeeRate: 5, employerRate: 12,
    baseComponentCodes: ["BASIC_SALARY", "HOUSING_ALLOWANCE"], employeePayableAccountCode: "2230", employerExpenseAccountCode: "5130", employerPayableAccountCode: "2230",
    establishmentFileNo: "SS-BGD-004417", remittanceCycle: "Monthly", activityRateOverrides: [],
    notes: L("قانون التقاعد والضمان الاجتماعي للعمال 39/1971", "Workers' Pension & Social Security Law 39/1971"), createdAt: "2015-01-04T08:00:00Z" },
  { id: "ss-2024", profileId: "pf-priv", effectiveFrom: "2024-01-01", effectiveTo: "2026-12-31", employeeRate: 5, employerRate: 12,
    baseComponentCodes: ssBases, employeePayableAccountCode: "2230", employerExpenseAccountCode: "5130", employerPayableAccountCode: "2230",
    establishmentFileNo: "SS-BGD-004417", remittanceCycle: "Monthly", activityRateOverrides: hazard(15),
    notes: L("قانون 18/2023 — النسب تُثبَّت رسمياً", "Law 18/2023 — rates to be officially confirmed"), createdAt: "2024-01-02T08:30:00Z" },
  { id: "ss-2027", profileId: "pf-priv", effectiveFrom: "2027-01-01", effectiveTo: null, employeeRate: 5, employerRate: 12,
    baseComponentCodes: ssBases, employeePayableAccountCode: "2230", employerExpenseAccountCode: "5130", employerPayableAccountCode: "2230",
    establishmentFileNo: "SS-BGD-004417", remittanceCycle: "Monthly", activityRateOverrides: hazard(16),
    notes: L("تحديث مقترح لنسبة الأنشطة الخطرة", "Proposed hazardous-activity rate update"), createdAt: "2026-09-10T11:00:00Z" },
]);

// ---- Activity log (config audit trail) ----
const actors = {
  hr: { name: L("سلمى الكربولي", "Salma Al-Karbouli"), role: "hrManager" },
  po: { name: L("هبة الجبوري", "Hiba Al-Jubouri"), role: "payrollOfficer" },
  fa: { name: L("محمد العبيدي", "Mohammed Al-Obaidi"), role: "financeAccountant" },
};
let al = 0;
const ev = (entityType, entityId, action, actor, at, ar, en, changes) => ({
  id: "al-" + String(++al).padStart(3, "0"), entityType, entityId, action, actor: actors[actor], timestamp: at, summary: L(ar, en), changes: changes || null,
});
const log = [
  ev("profile", "pf-gov", "Created", "hr", "2026-01-05T08:30:00Z", "إنشاء ملف القطاع الحكومي", "Government profile created"),
  ev("profile", "pf-priv", "Created", "hr", "2026-01-05T08:32:00Z", "إنشاء ملف القطاع الخاص", "Private profile created"),
  ev("profile", "pf-priv", "Updated", "po", "2026-02-18T13:40:00Z", "تعديل مضاعف العمل الإضافي", "Overtime multiplier updated", [{ field: "overtimeMultiplierNormal", from: "1.25", to: "1.5" }]),
  ev("profile", "pf-gov", "Updated", "hr", "2026-03-12T10:05:00Z", "تعديل سقف الاستقطاع الشهري", "Monthly deduction cap updated", [{ field: "maxMonthlyDeductionPercent", from: "30", to: "25" }]),
  ev("structure", "st-gov-2026", "Created", "po", "2026-01-05T08:45:00Z", "إنشاء الهيكل الحكومي القياسي", "Standard government structure created"),
  ev("structure", "st-gov-2024", "Deactivated", "po", "2025-12-31T16:00:00Z", "إغلاق نسخة 2024 بتاريخ 2025-12-31", "2024 version closed on 2025-12-31"),
  ev("structure", "st-priv-admin", "Created", "po", "2026-01-05T09:00:00Z", "إنشاء هيكل الإدارة (خاص)", "Private administration structure created"),
  ev("structure", "st-priv-workers", "Created", "po", "2026-01-05T09:10:00Z", "إنشاء هيكل العمال (خاص)", "Private workers structure created"),
  ev("structure", "st-priv-workers", "Updated", "po", "2026-04-02T11:20:00Z", "تجاوز نسبة بدل الخطورة إلى 12%", "Hazard allowance percent overridden to 12%", [{ field: "HAZARD_ALLOWANCE_PRIV.overridePercent", from: "10", to: "12" }]),
  ev("gradeScale", "gsc-2026", "Created", "hr", "2026-01-05T09:30:00Z", "إدخال سلّم الرواتب 2026", "2026 salary scale entered"),
  ev("gradeScale", "gsc-2026", "Updated", "hr", "2026-03-12T10:05:00Z", "رفع الاسمي للدرجة 10 / المرحلة 1", "Grade 10 / step 1 nominal raised", [{ field: "10/1.nominalSalary", from: "340000", to: "350000" }]),
  ev("tax", "tx-gov-2026", "Created", "po", "2026-01-05T08:50:00Z", "إضافة إعدادات الضريبة 2026 (حكومي)", "2026 tax settings added (government)"),
  ev("tax", "tx-gov-2024", "Closed", "po", "2026-01-05T08:50:00Z", "أُغلق السجل السابق تلقائياً بتاريخ 2025-12-31", "Previous record auto-closed on 2025-12-31"),
  ev("tax", "tx-priv-2026", "Created", "po", "2026-01-05T08:55:00Z", "إضافة إعدادات الضريبة 2026 (خاص)", "2026 tax settings added (private)"),
  ev("tax", "tx-priv-2027", "Created", "hr", "2026-09-10T11:00:00Z", "إضافة إعدادات ضريبة مستقبلية تبدأ 2027-01-01", "Future tax settings added, effective 2027-01-01"),
  ev("pension", "pn-2026", "Created", "po", "2026-01-05T08:30:00Z", "إضافة نسب التقاعد 2026", "2026 pension rates added"),
  ev("pension", "pn-2019", "Closed", "po", "2026-01-05T08:30:00Z", "أُغلق السجل السابق بتاريخ 2025-12-31", "Previous record closed on 2025-12-31"),
  ev("socialSecurity", "ss-2024", "Created", "hr", "2024-01-02T08:30:00Z", "اعتماد نسب الضمان وفق القانون 18/2023", "Social-security rates adopted under Law 18/2023"),
  ev("socialSecurity", "ss-2027", "Created", "hr", "2026-09-10T11:00:00Z", "إضافة إعداد ضمان مستقبلي (2027)", "Future social-security setting added (2027)"),
];
[
  ["NOMINAL_SALARY", "hr", "2026-01-05T08:30:00Z", "إنشاء البند", "Component created"],
  ["BASIC_SALARY", "hr", "2026-01-05T08:30:00Z", "إنشاء البند", "Component created"],
  ["INCOME_TAX", "po", "2026-01-05T08:30:00Z", "إنشاء البند", "Component created"],
  ["OVERTIME_GOV", "hr", "2026-01-05T08:35:00Z", "إنشاء البند مُطفأً افتراضياً (قرار #9)", "Component created, disabled by default (decision #9)"],
].forEach(([code, who, at, ar, en]) => log.push(ev("component", idOf[code], "Created", who, at, ar, en)));
log.push(ev("component", idOf.HOUSING_ALLOWANCE, "Updated", "po", "2026-02-02T09:12:00Z", "تفعيل علم الخضوع للضمان", "Social-security base flag enabled", [{ field: "isSocialSecurityBase", from: "false", to: "true" }]));
log.push(ev("component", idOf.TRANSPORT_ALLOWANCE_PRIV, "Updated", "po", "2026-02-02T09:20:00Z", "إعفاء البند من الضريبة", "Component marked tax-exempt", [{ field: "isTaxable", from: "true", to: "false" }]));
log.push(ev("component", idOf.OTHER_DEDUCTION, "Updated", "fa", "2026-03-20T14:00:00Z", "تغيير حساب GL إلى 5190", "GL account changed to 5190", [{ field: "payableAccountCode", from: "2250", to: "5190" }]));
log.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
w("config-activity-log.json", log);
console.log("ok", components.length, "components;", steps.length, "grade cells;", log.length, "log entries");
