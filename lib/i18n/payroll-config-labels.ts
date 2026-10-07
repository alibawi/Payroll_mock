import type { Locale } from "@/components/locale-provider";
import type { StatusTone } from "@/components/status-badge";

type LabelMap = Record<string, Record<Locale, string>>;

// Labels for module 1 (payroll configuration). Enum value → label maps use the exact enum strings
// from lib/payroll/types.ts so screens can index them directly.

export const componentTypeLabels = {
  Earning: { ar: "استحقاق", en: "Earning" },
  Deduction: { ar: "استقطاع", en: "Deduction" },
  EmployerContribution: { ar: "مساهمة صاحب العمل", en: "Employer contribution" },
  Informational: { ar: "معلوماتي", en: "Informational" },
} as const satisfies LabelMap;

export const componentTypeTones: Record<keyof typeof componentTypeLabels, StatusTone> = {
  Earning: "success",
  Deduction: "destructive",
  EmployerContribution: "info",
  Informational: "neutral",
};

export const componentCategoryLabels = {
  Basic: { ar: "أساسي", en: "Basic" },
  Allowance: { ar: "بدل / مخصص", en: "Allowance" },
  Overtime: { ar: "عمل إضافي", en: "Overtime" },
  Bonus: { ar: "مكافأة", en: "Bonus" },
  StatutoryPension: { ar: "تقاعد (قانوني)", en: "Pension (statutory)" },
  StatutorySocialSecurity: { ar: "ضمان اجتماعي (قانوني)", en: "Social security (statutory)" },
  IncomeTax: { ar: "ضريبة الدخل", en: "Income tax" },
  LoanRepayment: { ar: "سداد قرض/سلفة", en: "Loan repayment" },
  UnionDues: { ar: "رسوم نقابة", en: "Union dues" },
  AbsenceDeduction: { ar: "خصم غياب", en: "Absence deduction" },
  LatenessDeduction: { ar: "خصم تأخير", en: "Lateness deduction" },
  DisciplinaryPenalty: { ar: "عقوبة تأديبية", en: "Disciplinary penalty" },
  CourtOrder: { ar: "اقتطاع قضائي", en: "Court order" },
  Other: { ar: "أخرى", en: "Other" },
} as const satisfies LabelMap;

export const calculationMethodLabels = {
  FixedAmount: { ar: "مبلغ ثابت", en: "Fixed amount" },
  PercentOfBase: { ar: "نسبة من وعاء", en: "Percent of base" },
  Formula: { ar: "معادلة", en: "Formula" },
  RateTable: { ar: "جدول شرائح", en: "Rate table" },
  AttendanceDriven: { ar: "مرتبط بالحضور", en: "Attendance-driven" },
  Manual: { ar: "يدوي", en: "Manual" },
} as const satisfies LabelMap;

export const componentFlagLabels = {
  isTaxable: { ar: "خاضع للضريبة", en: "Taxable" },
  isPensionable: { ar: "خاضع للتقاعد", en: "Pensionable" },
  isSocialSecurityBase: { ar: "وعاء الضمان", en: "Social-security base" },
  isProratable: { ar: "يُحتسب نسبياً", en: "Prorated" },
  reducesGross: { ar: "يخفّض الإجمالي", en: "Reduces gross" },
} as const satisfies LabelMap;

export const flagShortLabels = {
  isTaxable: { ar: "ضريبة", en: "Tax" },
  isPensionable: { ar: "تقاعد", en: "Pension" },
  isSocialSecurityBase: { ar: "ضمان", en: "SS" },
  isProratable: { ar: "نسبي", en: "Prorate" },
  reducesGross: { ar: "يخفّض Gross", en: "Cuts gross" },
} as const satisfies LabelMap;

export const illustrativeNotice = {
  title: { ar: "الأرقام توضيحية", en: "Figures are illustrative" },
  description: {
    ar: "النسب والشرائح والإعفاءات هنا توضيحية للموك أب — تُثبَّت من الجريدة الرسمية وتعليمات الجهات المختصة قبل الاعتماد (الدراسة 4/5).",
    en: "Rates, brackets and exemptions here are mock-up placeholders — to be confirmed from the official gazette and authority instructions before adoption (study 4/5).",
  },
} as const satisfies LabelMap;

export const configCommon = {
  code: { ar: "الكود", en: "Code" },
  name: { ar: "الاسم", en: "Name" },
  nameAr: { ar: "الاسم بالعربي", en: "Arabic name" },
  nameEn: { ar: "الاسم بالإنكليزي", en: "English name" },
  type: { ar: "النوع", en: "Type" },
  category: { ar: "الفئة", en: "Category" },
  method: { ar: "طريقة الاحتساب", en: "Calculation method" },
  flags: { ar: "أعلام الأوعية", en: "Base flags" },
  active: { ar: "نشط", en: "Active" },
  inactive: { ar: "معطّل", en: "Inactive" },
  status: { ar: "الحالة", en: "Status" },
  all: { ar: "الكل", en: "All" },
  profile: { ar: "الملف", en: "Profile" },
  sequence: { ar: "التسلسل", en: "Sequence" },
  percent: { ar: "النسبة %", en: "Percent %" },
  baseComponents: { ar: "بنود الوعاء", en: "Base components" },
  expenseAccount: { ar: "حساب المصروف (GL)", en: "Expense account (GL)" },
  payableAccount: { ar: "حساب الأمانات/الذمم (GL)", en: "Payable account (GL)" },
  noAccount: { ar: "بلا حساب", en: "No account" },
  effectiveFrom: { ar: "يسري من", en: "Effective from" },
  effectiveTo: { ar: "حتى", en: "Until" },
  openEnded: { ar: "مفتوح", en: "Open" },
  notes: { ar: "ملاحظات", en: "Notes" },
  lastUpdated: { ar: "آخر تحديث", en: "Last updated" },
  newItem: { ar: "جديد", en: "New" },
  backToList: { ar: "العودة للائحة", en: "Back to list" },
  saved: { ar: "تم الحفظ", en: "Saved" },
  saving: { ar: "جارٍ الحفظ...", en: "Saving..." },
  noChanges: { ar: "لا توجد تغييرات", en: "No changes" },
  activate: { ar: "تفعيل", en: "Activate" },
  deactivate: { ar: "تعطيل", en: "Deactivate" },
  readOnly: { ar: "للعرض فقط حسب دورك", en: "Read-only for your role" },
  notFound: { ar: "العنصر غير موجود", en: "Item not found" },
  validationFailed: { ar: "تعذّر الحفظ — راجع الحقول المظلّلة", en: "Could not save — review the highlighted fields" },
  ruleRef: { ar: "القاعدة", en: "Rule" },
} as const satisfies LabelMap;

export const componentScreenLabels = {
  searchPlaceholder: { ar: "بحث بالكود أو الاسم", en: "Search by code or name" },
  tabAll: { ar: "الكل", en: "All" },
  tabEarnings: { ar: "الاستحقاقات", en: "Earnings" },
  tabDeductions: { ar: "الاستقطاعات", en: "Deductions" },
  tabContributions: { ar: "المساهمات", en: "Contributions" },
  tabInformational: { ar: "المعلوماتية", en: "Informational" },
  kpiTotal: { ar: "إجمالي البنود", en: "Total components" },
  kpiActive: { ar: "بنود نشطة", en: "Active components" },
  kpiStatutory: { ar: "بنود قانونية", en: "Statutory components" },
  kpiReducesGross: { ar: "تخفّض الإجمالي", en: "Reduce gross" },
  emptyTitle: { ar: "لا توجد بنود مطابقة", en: "No matching components" },
  newComponent: { ar: "بند جديد", en: "New component" },
  gl: { ar: "حسابات GL", en: "GL accounts" },
  usedIn: { ar: "الهياكل التي تستخدمه", en: "Used in structures" },
  notUsed: { ar: "غير مستخدم في أي هيكل", en: "Not used in any structure" },
  basics: { ar: "البيانات الأساسية", en: "Basics" },
  calculation: { ar: "الاحتساب", en: "Calculation" },
  audit: { ar: "سجل التغييرات", en: "Audit trail" },
  noAudit: { ar: "لا توجد حركات", en: "No activity yet" },
  edit: { ar: "تعديل البند", en: "Edit component" },
  createTitle: { ar: "بند راتب جديد", en: "New pay component" },
  deactivateConfirmTitle: { ar: "تعطيل البند؟", en: "Deactivate this component?" },
  deactivateConfirmBody: {
    ar: "لا يُحذف البند أبداً (قاعدة C-12) — يُعطَّل فقط ويبقى بالهياكل القديمة وسجل التدقيق.",
    en: "Components are never deleted (rule C-12) — they are only deactivated and stay in old structures and the audit trail.",
  },
  baseHint: { ar: "البنود التي تُحتسب النسبة عليها", en: "Components the percentage is applied on" },
  baseHintAttendance: { ar: "الأساس لمعدّل الساعة/اليوم", en: "Basis for the hourly / daily rate" },
  flagsHint: { ar: "تحدّد الأوعية التي يدخل فيها هذا البند عند الاحتساب", en: "Decide which bases this component feeds during calculation" },
  seqHint: { ar: "ترتيب العرض داخل القسيمة", en: "Display order on the payslip" },
} as const satisfies LabelMap;

export const auditActionLabels = {
  Created: { ar: "إنشاء", en: "Created" },
  Updated: { ar: "تعديل", en: "Updated" },
  Activated: { ar: "تفعيل", en: "Activated" },
  Deactivated: { ar: "تعطيل", en: "Deactivated" },
  Closed: { ar: "إغلاق", en: "Closed" },
} as const satisfies LabelMap;

export const auditLabels = {
  by: { ar: "بواسطة", en: "by" },
  from: { ar: "من", en: "from" },
  to: { ar: "إلى", en: "to" },
} as const satisfies LabelMap;

export const profileLabels = {
  tabGeneral: { ar: "عام", en: "General" },
  tabAttendance: { ar: "سياسة الحضور", en: "Attendance policy" },
  tabRegimes: { ar: "الأنظمة المفعّلة", en: "Enabled regimes" },
  tabAudit: { ar: "التدقيق", en: "Audit" },
  employees: { ar: "الموظفون", en: "Employees" },
  payFrequency: { ar: "دورة الدفع", en: "Pay frequency" },
  rounding: { ar: "تقريب المبالغ (د.ع)", en: "Amount rounding (IQD)" },
  cutoffDay: { ar: "يوم القطع", en: "Cut-off day" },
  currency: { ar: "العملة", en: "Currency" },
  dayRateBasis: { ar: "أساس معدّل اليوم", en: "Day-rate basis" },
  workingDays: { ar: "أيام العمل الفعلية", en: "Working days" },
  calendarDays: { ar: "أيام الشهر التقويمية", en: "Calendar days" },
  otNormal: { ar: "مضاعف الإضافي العادي", en: "Normal overtime multiplier" },
  otRest: { ar: "مضاعف يوم الراحة", en: "Rest-day multiplier" },
  otHoliday: { ar: "مضاعف العطلة الرسمية", en: "Holiday multiplier" },
  monthly: { ar: "شهري", en: "Monthly" },
  weekly: { ar: "أسبوعي", en: "Weekly" },
  daily: { ar: "يومي", en: "Daily" },
  underDevelopment: { ar: "قيد التطوير", en: "Under development" },
  enablePension: { ar: "التقاعد الموحّد", en: "Unified pension" },
  enableSocialSecurity: { ar: "الضمان الاجتماعي للعمال", en: "Workers' social security" },
  enableIncomeTax: { ar: "ضريبة الدخل", en: "Income tax" },
  regimeNote: {
    ar: "الملف لا يفعّل التقاعد والضمان معاً (C-5) — الاختيار الفعلي للموظف يُحدَّد في تعويضه.",
    en: "A profile never enables pension and social security together (C-5) — the employee's actual choice is set in their compensation.",
  },
  grace: { ar: "فترة السماح (دقيقة)", en: "Grace period (minutes)" },
  latenessMethod: { ar: "طريقة خصم التأخير", en: "Lateness method" },
  methodPerMinute: { ar: "بالدقيقة", en: "Per minute" },
  methodTiers: { ar: "شرائح", en: "Tiers" },
  methodCountBased: { ar: "حسب عدد المرات", en: "By occurrences" },
  tiers: { ar: "شرائح التأخير", en: "Lateness tiers" },
  tierFrom: { ar: "من (دقيقة)", en: "From (min)" },
  tierTo: { ar: "إلى (دقيقة)", en: "To (min)" },
  tierFraction: { ar: "الخصم (جزء من اليوم)", en: "Deduction (day fraction)" },
  addTier: { ar: "إضافة شريحة", en: "Add tier" },
  ratePerMinute: { ar: "معدّل الدقيقة (د.ع)", en: "Rate per minute (IQD)" },
  maxLateEvents: { ar: "عدد التأخيرات قبل خصم يوم", en: "Late events before a day cut" },
  absenceBase: { ar: "بنود معدّل يوم الغياب", en: "Absence day-rate components" },
  deductionCap: { ar: "سقف الاستقطاع الشهري %", en: "Monthly deduction cap %" },
  overBreach: { ar: "عند تجاوز السقف", en: "On cap breach" },
  autoSpread: { ar: "تدوير الفائض للشهر التالي", en: "Spread the excess to next month" },
  block: { ar: "إيقاف الاحتساب لمراجعة", en: "Block and require review" },
  openEnded: { ar: "مفتوحة", en: "Open" },
  preview: { ar: "معاينة الأثر", en: "Impact preview" },
  previewExample: {
    ar: "مثال: أجر 900,000 / 26 يوم عمل ← معدّل اليوم 34,615 د.ع",
    en: "Example: wage 900,000 / 26 working days → day rate 34,615 IQD",
  },
  saveChanges: { ar: "حفظ التغييرات", en: "Save changes" },
  discard: { ar: "تراجع", en: "Discard" },
  tabs: { ar: "تبويبات الملف", en: "Profile tabs" },
} as const satisfies LabelMap;

export const structureLabels = {
  profile: { ar: "الملف", en: "Profile" },
  lines: { ar: "سطور الهيكل", en: "Structure lines" },
  addLine: { ar: "إضافة بند", en: "Add component" },
  component: { ar: "البند", en: "Component" },
  overrideMethod: { ar: "تجاوز الطريقة", en: "Method override" },
  overrideAmount: { ar: "تجاوز المبلغ", en: "Amount override" },
  overridePercent: { ar: "تجاوز النسبة %", en: "Percent override" },
  overrideExpense: { ar: "حساب المصروف", en: "Expense account" },
  overridePayable: { ar: "حساب الأمانات", en: "Payable account" },
  moveUp: { ar: "أعلى", en: "Move up" },
  moveDown: { ar: "أسفل", en: "Move down" },
  removeLine: { ar: "إزالة السطر", en: "Remove line" },
  newStructure: { ar: "هيكل جديد", en: "New structure" },
  editStructure: { ar: "تحرير الهيكل", en: "Edit structure" },
  linesCount: { ar: "عدد البنود", en: "Lines" },
  noLines: { ar: "لا توجد سطور بعد", en: "No lines yet" },
  inheritFrom: { ar: "الافتراضي من البند", en: "Inherited from the component" },
  duplicate: { ar: "البند موجود مسبقاً في الهيكل", en: "Component already in the structure" },
  pickComponent: { ar: "اختر بنداً", en: "Pick a component" },
  structuresOfProfile: { ar: "هياكل هذا الملف", en: "Structures of this profile" },
  status: { ar: "الحالة", en: "Status" },
} as const satisfies LabelMap;

export const effectiveStatusLabels = {
  Upcoming: { ar: "قادم", en: "Upcoming" },
  Current: { ar: "نافذ", en: "Current" },
  Expired: { ar: "منتهٍ", en: "Expired" },
} as const satisfies LabelMap;

export const effectiveStatusTones: Record<keyof typeof effectiveStatusLabels, StatusTone> = {
  Upcoming: "info",
  Current: "success",
  Expired: "neutral",
};

export const gradeLabels = {
  grade: { ar: "الدرجة", en: "Grade" },
  step: { ar: "المرحلة", en: "Step" },
  nominal: { ar: "الراتب الاسمي", en: "Nominal salary" },
  increment: { ar: "العلاوة السنوية", en: "Annual increment" },
  viewNominal: { ar: "الاسمي", en: "Nominal" },
  viewIncrement: { ar: "العلاوة", en: "Increment" },
  edit: { ar: "تحرير الشبكة", en: "Edit grid" },
  cell: { ar: "الخلية المحددة", en: "Selected cell" },
  scale: { ar: "السلّم", en: "Scale" },
  highlight: { ar: "الدرجة 7 / المرحلة 3 = 620,000 (مثال الدراسة 12.1)", en: "Grade 7 / step 3 = 620,000 (study example 12.1)" },
  employeesInCell: { ar: "موظفون بهذه الخلية", en: "Employees in this cell" },
  employeesPending: {
    ar: "يُربط بتعويض الموظف في الموديول 2",
    en: "Linked to employee compensation in module 2",
  },
  invalid: { ar: "قيمة غير صالحة", en: "Invalid value" },
  gradeHigher: { ar: "الدرجة 1 الأعلى راتباً", en: "Grade 1 is the highest paid" },
} as const satisfies LabelMap;

export const taxLabels = {
  history: { ar: "السجل المؤرّخ", en: "Effective-dated history" },
  brackets: { ar: "شرائح الضريبة", en: "Tax brackets" },
  exemptions: { ar: "الإعفاءات السنوية", en: "Annual exemptions" },
  from: { ar: "من", en: "From" },
  to: { ar: "إلى", en: "To" },
  rate: { ar: "النسبة %", en: "Rate %" },
  amount: { ar: "المبلغ السنوي", en: "Annual amount" },
  monthlyEquivalent: { ar: "المكافئ الشهري", en: "Monthly equivalent" },
  calcBasis: { ar: "أساس الاحتساب", en: "Calculation basis" },
  monthlyDirect: { ar: "شهري مباشر", en: "Monthly direct" },
  annualized: { ar: "سنوي مُوزّع", en: "Annualised" },
  newRecord: { ar: "سجل جديد", en: "New record" },
  newRecordHint: {
    ar: "كل تعديل جوهري سجل جديد بتاريخ سريان؛ يُغلق السجل السابق تلقائياً قبل التاريخ بيوم.",
    en: "Every material change is a new dated record; the previous one is auto-closed the day before.",
  },
  addBracket: { ar: "إضافة شريحة", en: "Add bracket" },
  calculator: { ar: "حاسبة تجريبية", en: "Test calculator" },
  calcInput: { ar: "الوعاء الضريبي الشهري (د.ع)", en: "Monthly taxable base (IQD)" },
  calcHint: { ar: "أدخل الوعاء بعد خصم التقاعد/الضمان", en: "Enter the base after pension / social security" },
  calcExemptions: { ar: "الإعفاءات المطبّقة", en: "Applied exemptions" },
  taxableAfter: { ar: "الوعاء بعد الإعفاء", en: "Base after exemptions" },
  taxDue: { ar: "الضريبة المستحقة", en: "Tax due" },
  effectiveRate: { ar: "النسبة الفعلية", en: "Effective rate" },
  married: { ar: "متزوج", en: "Married" },
  children: { ar: "عدد الأطفال", en: "Children" },
  ageOver63: { ar: "فوق 63", en: "Over 63" },
  disability: { ar: "إعاقة", en: "Disability" },
  step: { ar: "الشريحة", en: "Bracket" },
  slice: { ar: "الجزء الخاضع", en: "Taxed slice" },
  taxOfSlice: { ar: "الضريبة", en: "Tax" },
  noTax: { ar: "لا ضريبة — الوعاء أقل من الإعفاء", en: "No tax — base is below the exemption" },
  currentSettings: { ar: "الإعداد النافذ", en: "Current settings" },
  noRecords: { ar: "لا توجد سجلات لهذا الملف", en: "No records for this profile" },
  unbounded: { ar: "∞", en: "∞" },
  saveRecord: { ar: "حفظ السجل", en: "Save record" },
  closesPrevious: { ar: "سيُغلق السجل السابق بتاريخ", en: "The previous record will close on" },
} as const satisfies LabelMap;

export const exemptionKindLabels = {
  Personal: { ar: "شخصي", en: "Personal" },
  Married: { ar: "زوجية", en: "Married" },
  Spouse: { ar: "الزوج/الزوجة", en: "Spouse" },
  PerChild: { ar: "لكل طفل", en: "Per child" },
  AgeOver63: { ar: "عمر فوق 63", en: "Age over 63" },
  Disability: { ar: "عجز", en: "Disability" },
} as const satisfies LabelMap;

export const statutoryLabels = {
  employeeRate: { ar: "حصة الموظف %", en: "Employee rate %" },
  employerRate: { ar: "حصة صاحب العمل %", en: "Employer rate %" },
  baseComponents: { ar: "بنود الوعاء", en: "Base components" },
  employeePayable: { ar: "حساب أمانات الموظف", en: "Employee payable account" },
  employerExpense: { ar: "حساب مصروف صاحب العمل", en: "Employer expense account" },
  employerPayable: { ar: "حساب أمانات صاحب العمل", en: "Employer payable account" },
  establishmentFile: { ar: "رقم ملف المنشأة", en: "Establishment file no." },
  remittanceCycle: { ar: "دورة التوريد", en: "Remittance cycle" },
  monthly: { ar: "شهري", en: "Monthly" },
  quarterly: { ar: "ربع سنوي", en: "Quarterly" },
  activityOverrides: { ar: "نسب خاصة بالأنشطة", en: "Activity-specific rates" },
  activity: { ar: "النشاط", en: "Activity" },
  addOverride: { ar: "إضافة نسبة نشاط", en: "Add activity rate" },
  law: { ar: "السند القانوني", en: "Legal basis" },
} as const satisfies LabelMap;

export const permissionLabels = {
  matrix: { ar: "مصفوفة الصلاحيات", en: "Permission matrix" },
  subject: { ar: "الشاشة / الكيان", en: "Screen / entity" },
  note: {
    ar: "الاختيارات هنا شكلية للعرض؛ الإخفاء الفعلي للأزرار يتبع الصلاحيات الافتراضية للدور.",
    en: "Toggles here are cosmetic for the demo; real button hiding follows the role's default permissions.",
  },
  reset: { ar: "إعادة الافتراضي", en: "Reset to defaults" },
  actions: {
    view: { ar: "عرض", en: "View" },
    create: { ar: "إنشاء", en: "Create" },
    update: { ar: "تعديل", en: "Update" },
    delete: { ar: "حذف/تعطيل", en: "Delete / disable" },
    approve: { ar: "اعتماد", en: "Approve" },
    disburse: { ar: "صرف", en: "Disburse" },
    cancel: { ar: "إلغاء", en: "Cancel" },
    calculate: { ar: "احتساب", en: "Calculate" },
    post: { ar: "ترحيل", en: "Post" },
    pay: { ar: "دفع", en: "Pay" },
    reverse: { ar: "عكس", en: "Reverse" },
    export: { ar: "تصدير", en: "Export" },
  },
  subjects: {
    "payroll.component": { ar: "بنود الراتب", en: "Pay components" },
    "payroll.structure": { ar: "هياكل الرواتب", en: "Salary structures" },
    "payroll.config": { ar: "الملفات والضريبة والتقاعد والسلّم", en: "Profiles, tax, pension and scale" },
    "payroll.compensation": { ar: "تعويض الموظف (الرواتب)", en: "Employee compensation" },
    "payroll.loan": { ar: "السلف والقروض", en: "Loans & advances" },
    "payroll.penalty": { ar: "العقوبات التأديبية", en: "Disciplinary penalties" },
    "payroll.period": { ar: "فترات الرواتب", en: "Payroll periods" },
    "payroll.input": { ar: "مدخلات الرواتب", en: "Payroll inputs" },
    "payroll.run": { ar: "دورات الرواتب", en: "Payroll runs" },
    "payroll.report": { ar: "التقارير والتوريد", en: "Reports and remittances" },
    "payroll.eos": { ar: "نهاية الخدمة", en: "End of service" },
  },
  yourRole: { ar: "دورك الحالي", en: "Your current role" },
  noRole: { ar: "لم يُختَر دور (عرض فقط)", en: "No role selected (view only)" },
} as const;

export const landingLabels = {
  kpiActiveComponents: { ar: "بنود نشطة", en: "Active components" },
  kpiStructures: { ar: "هياكل نشطة", en: "Active structures" },
  kpiTopProfile: { ar: "الملف الأكثر استخداماً", en: "Most used profile" },
  kpiExpiring: { ar: "إعدادات تنتهي قريباً", en: "Settings expiring soon" },
  kpiUpcoming: { ar: "تغييرات قادمة", en: "Upcoming changes" },
  employeesSuffix: { ar: "موظف", en: "employees" },
  expiringNote: { ar: "خلال 90 يوماً", en: "within 90 days" },
  lastTax: { ar: "آخر سجل ضريبة", en: "Latest tax record" },
  lastPension: { ar: "آخر سجل تقاعد", en: "Latest pension record" },
  lastSs: { ar: "آخر سجل ضمان", en: "Latest social-security record" },
  expiringAlert: { ar: "تنبيه: إعداد ينتهي قريباً", en: "Heads-up: a setting expires soon" },
  expiringBody: { ar: "ينتهي بتاريخ", en: "ends on" },
  configHealth: { ar: "صحة المرجعيات", en: "Configuration health" },
  recentActivity: { ar: "آخر حركات المرجعيات", en: "Recent configuration activity" },
} as const satisfies LabelMap;
