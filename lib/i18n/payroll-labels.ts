import type { Locale } from "@/components/locale-provider";

type LabelMap = Record<string, Record<Locale, string>>;

/** Sidebar group headings + sub-section names for the payroll module (docs/roadmap.md 5). */
export const payrollNavGroupLabels = {
  setup: { ar: "مرجعيات الرواتب", en: "Configuration" },
  people: { ar: "الموظفون", en: "Employees" },
  runs: { ar: "الدورات", en: "Payroll cycle" },
  reports: { ar: "التقارير", en: "Reports" },
  selfService: { ar: "خدمتي", en: "Self-service" },
  admin: { ar: "الإدارة", en: "Administration" },
} as const satisfies LabelMap;

/** Labels for payroll-specific shared components (PayslipLineTable, JournalPreview…). */
export const payslipLabels = {
  earnings: { ar: "الاستحقاقات", en: "Earnings" },
  deductions: { ar: "الاستقطاعات", en: "Deductions" },
  employerContributions: { ar: "مساهمات صاحب العمل", en: "Employer contributions" },
  informational: { ar: "بنود معلوماتية", en: "Informational" },
  component: { ar: "البند", en: "Component" },
  base: { ar: "الأساس", en: "Base" },
  rate: { ar: "النسبة / المعدّل", en: "Rate" },
  quantity: { ar: "الكمية", en: "Quantity" },
  amount: { ar: "المبلغ", en: "Amount" },
  source: { ar: "المصدر", en: "Source" },
  grossPay: { ar: "الإجمالي (Gross)", en: "Gross pay" },
  totalDeductions: { ar: "إجمالي استقطاعات الموظف", en: "Total employee deductions" },
  netPay: { ar: "صافي الراتب", en: "Net pay" },
  employerCost: { ar: "كلفة صاحب العمل", en: "Employer cost" },
  noLines: { ar: "لا توجد بنود", en: "No lines" },
} as const satisfies LabelMap;

export const payslipSourceLabels = {
  Structure: { ar: "هيكل الراتب", en: "Structure" },
  Override: { ar: "تجاوز الموظف", en: "Override" },
  Input: { ar: "مدخل", en: "Input" },
  Loan: { ar: "سلفة/قرض", en: "Loan" },
  Statutory: { ar: "قانوني", en: "Statutory" },
  Penalty: { ar: "عقوبة", en: "Penalty" },
  Attendance: { ar: "الحضور", en: "Attendance" },
} as const satisfies LabelMap;

export const journalLabels = {
  title: { ar: "معاينة القيد المحاسبي", en: "Journal entry preview" },
  account: { ar: "الحساب", en: "Account" },
  description: { ar: "البيان", en: "Description" },
  costCenter: { ar: "مركز الكلفة", en: "Cost centre" },
  debit: { ar: "مدين", en: "Debit" },
  credit: { ar: "دائن", en: "Credit" },
  total: { ar: "المجموع", en: "Total" },
  balanced: { ar: "القيد متوازن", en: "Entry is balanced" },
  unbalanced: { ar: "القيد غير متوازن", en: "Entry is not balanced" },
  difference: { ar: "الفرق", en: "Difference" },
  reference: { ar: "المرجع", en: "Reference" },
  previewNotice: {
    ar: "معاينة فقط — لا يُرحَّل قيد حقيقي إلى المالية",
    en: "Preview only — no real journal is posted to Finance",
  },
} as const satisfies LabelMap;

/** One-line purpose of each configuration screen (docs/spec-payroll-config.md 8), shown under the page title. */
export const payrollScreenDescriptions = {
  module: {
    ar: "إدارة الرواتب والاستقطاعات والسلف وقسائم الدفع لموظفي القطاعين الحكومي والخاص",
    en: "Manage salaries, deductions, advances and payslips for government and private-sector staff",
  },
  components: {
    ar: "تعريف بنود الراتب (استحقاقات، استقطاعات، مساهمات) وأعلام الأوعية وحسابات GL",
    en: "Define pay components (earnings, deductions, contributions), base flags and GL accounts",
  },
  profiles: {
    ar: "ملفّا النظام الحكومي والخاص: التقريب، مضاعفات الإضافي، وسياسة الحضور",
    en: "Government and private-sector profiles: rounding, overtime multipliers and attendance policy",
  },
  structures: {
    ar: "هياكل الرواتب وسطور البنود مع تجاوز الطريقة والمبلغ والحسابات",
    en: "Salary structures and their component lines, with method, amount and account overrides",
  },
  gradeScales: {
    ar: "السلّم الوظيفي الحكومي: الراتب الاسمي والعلاوة السنوية لكل درجة ومرحلة",
    en: "Government grade scale: nominal salary and annual increment per grade and step",
  },
  tax: {
    ar: "شرائح ضريبة الدخل والإعفاءات، بسجل مؤرّخ وحاسبة تجريبية",
    en: "Income-tax brackets and exemptions, with an effective-dated history and a test calculator",
  },
  pension: {
    ar: "نسب التقاعد للموظف وصاحب العمل (النظام الحكومي)، بسجل مؤرّخ",
    en: "Employee and employer pension rates (government regime), effective-dated",
  },
  socialSecurity: {
    ar: "نسب الضمان الاجتماعي للموظف وصاحب العمل (النظام الخاص)، بسجل مؤرّخ",
    en: "Employee and employer social-security rates (private regime), effective-dated",
  },
  permissions: {
    ar: "مصفوفة صلاحيات الأدوار على شاشات وبيانات موديول الرواتب",
    en: "Role permission matrix over the payroll module's screens and data",
  },
} as const satisfies LabelMap;

/** Shown inside a scaffolded (data-less) route until its screen is built. */
export const scaffoldLabels = {
  title: { ar: "الشاشة جاهزة كهيكل فقط", en: "Screen scaffold only" },
  description: {
    ar: "الراوت والتنقل جاهزان — البيانات والمكوّنات تُضاف بالخطوات القادمة",
    en: "Route and navigation are in place — data and components arrive in the next steps",
  },
} as const satisfies LabelMap;

export const payrollNavLabels = {
  components: { ar: "بنود الراتب", en: "Pay components" },
  profiles: { ar: "الملفات (حكومي / خاص)", en: "Profiles (Govt / Private)" },
  structures: { ar: "هياكل الرواتب", en: "Salary structures" },
  gradeScales: { ar: "السلّم الوظيفي", en: "Grade scale" },
  tax: { ar: "ضريبة الدخل", en: "Income tax" },
  pension: { ar: "التقاعد", en: "Pension" },
  socialSecurity: { ar: "الضمان الاجتماعي", en: "Social security" },
  compensations: { ar: "تعويض الموظف", en: "Compensation" },
  loans: { ar: "السلف والقروض", en: "Loans & advances" },
  penalties: { ar: "العقوبات والغياب", en: "Penalties & attendance" },
  periods: { ar: "فترات الرواتب", en: "Payroll periods" },
  inputs: { ar: "المدخلات", en: "Inputs" },
  runs: { ar: "دورات الرواتب", en: "Payroll runs" },
  reports: { ar: "مركز التقارير", en: "Reports hub" },
  remittances: { ar: "كشوف التوريد", en: "Remittances" },
  endOfService: { ar: "نهاية الخدمة", en: "End of service" },
  myPayslips: { ar: "قسائمي", en: "My payslips" },
  myLoans: { ar: "سلفي", en: "My loans" },
  permissions: { ar: "الصلاحيات", en: "Permissions" },
} as const satisfies LabelMap;
