import type { Locale } from "@/components/locale-provider";
import type { StatusTone } from "@/components/status-badge";

type LabelMap = Record<string, Record<Locale, string>>;

export const compensationStatusLabels = {
  Upcoming: { ar: "قادم", en: "Upcoming" },
  Current: { ar: "نافذ", en: "Current" },
  Superseded: { ar: "منتهٍ", en: "Superseded" },
} as const satisfies LabelMap;

export const compensationStatusTones: Record<keyof typeof compensationStatusLabels, StatusTone> = {
  Upcoming: "info",
  Current: "success",
  Superseded: "neutral",
};

export const paymentMethodLabels = {
  Bank: { ar: "مصرفي", en: "Bank" },
  Cash: { ar: "نقدي", en: "Cash" },
} as const satisfies LabelMap;

export const maritalLabels = {
  Single: { ar: "أعزب", en: "Single" },
  Married: { ar: "متزوج", en: "Married" },
  Divorced: { ar: "مطلّق", en: "Divorced" },
  Widowed: { ar: "أرمل", en: "Widowed" },
} as const satisfies LabelMap;

export const employeeStatusLabels = {
  active: { ar: "على رأس العمل", en: "Active" },
  on_leave: { ar: "في إجازة", en: "On leave" },
  resigned: { ar: "مستقيل", en: "Resigned" },
  terminated: { ar: "منتهي الخدمة", en: "Terminated" },
  archived: { ar: "مؤرشف", en: "Archived" },
} as const satisfies LabelMap;

export const employmentTypeLabels = {
  Permanent: { ar: "دائم", en: "Permanent" },
  Contract: { ar: "عقد", en: "Contract" },
  Temporary: { ar: "مؤقت", en: "Temporary" },
  PartTime: { ar: "دوام جزئي", en: "Part-time" },
  Internship: { ar: "تدريب", en: "Internship" },
} as const satisfies LabelMap;

export const compensationActionLabels = {
  Assigned: { ar: "تعيين راتب", en: "Assigned" },
  Increment: { ar: "علاوة سنوية", en: "Increment" },
  Promotion: { ar: "ترفيع", en: "Promotion" },
  Imported: { ar: "استيراد", en: "Imported" },
  Adjusted: { ar: "تعديل", en: "Adjusted" },
} as const satisfies LabelMap;

export const compListLabels = {
  searchPlaceholder: { ar: "بحث بالاسم أو الرقم الوظيفي", en: "Search by name or employee code" },
  employee: { ar: "الموظف", en: "Employee" },
  department: { ar: "القسم", en: "Department" },
  profile: { ar: "الملف", en: "Profile" },
  basis: { ar: "الأساس / الدرجة", en: "Basis / grade" },
  gross: { ar: "الإجمالي المتوقع", en: "Projected gross" },
  net: { ar: "الصافي المتوقع", en: "Projected net" },
  payment: { ar: "طريقة الدفع", en: "Payment" },
  since: { ar: "منذ", en: "Since" },
  state: { ar: "الحالة", en: "State" },
  tabAll: { ar: "الكل", en: "All" },
  tabGov: { ar: "حكومي", en: "Government" },
  tabPriv: { ar: "خاص", en: "Private" },
  tabNone: { ar: "بلا تعويض", en: "No compensation" },
  noCompensation: { ar: "بلا تعويض", en: "No compensation" },
  upcoming: { ar: "تغيير قادم", en: "Upcoming change" },
  ended: { ar: "منتهٍ", en: "Ended" },
  belowMin: { ar: "دون الحد الأدنى", en: "Below minimum" },
  import: { ar: "استيراد Excel", en: "Import Excel" },
  assign: { ar: "تعيين راتب", en: "Assign salary" },
  kpiWithSalary: { ar: "موظفون بتعويض", en: "Employees with salary" },
  kpiMissing: { ar: "بلا تعويض", en: "Without compensation" },
  kpiBelowMin: { ar: "دون الحد الأدنى للأجور", en: "Below minimum wage" },
  kpiChanges: { ar: "تعديلات آخر 30 يوماً", en: "Changes in last 30 days" },
  kpiAvg: { ar: "متوسط الإجمالي", en: "Average gross" },
  alertMissing: { ar: "موظفون على رأس العمل بلا تعويض", en: "Active employees without compensation" },
  alertBelow: { ar: "أجور دون الحد الأدنى", en: "Wages below the minimum" },
  minimumWage: { ar: "الحد الأدنى للأجور", en: "Minimum wage" },
  maskedNotice: {
    ar: "المبالغ مخفية حسب صلاحية دورك.",
    en: "Amounts are hidden for your role.",
  },
  employeeRole: {
    ar: "حساب الموظف الذاتي: راتبك يظهر في «قسائمي» (يُبنى لاحقاً).",
    en: "Employee self-service: your pay shows in “My payslips” (built later).",
  },
  deptScope: { ar: "نطاق قسمك فقط", en: "Your department only" },
} as const satisfies LabelMap;

export const compDetailLabels = {
  currentCompensation: { ar: "الراتب الحالي", en: "Current compensation" },
  none: { ar: "لا يوجد تعويض نافذ لهذا الموظف", en: "This employee has no current compensation" },
  profile: { ar: "الملف", en: "Profile" },
  structure: { ar: "هيكل الراتب", en: "Salary structure" },
  gradeStep: { ar: "الدرجة / المرحلة", en: "Grade / step" },
  nominal: { ar: "الراتب الاسمي", en: "Nominal salary" },
  baseSalary: { ar: "الأجر الأساسي", en: "Base salary" },
  payment: { ar: "طريقة الدفع", en: "Payment method" },
  bankAccount: { ar: "الحساب المصرفي", en: "Bank account" },
  costCenter: { ar: "مركز الكلفة", en: "Cost centre" },
  maritalStatus: { ar: "الحالة الاجتماعية (ضريبياً)", en: "Marital status (tax)" },
  children: { ar: "عدد الأطفال المستحقين", en: "Eligible children" },
  pensionExempt: { ar: "مستثنى من التقاعد/الضمان", en: "Pension / SS exempt" },
  effectiveFrom: { ar: "يسري من", en: "Effective from" },
  serviceYears: { ar: "سنوات الخدمة", en: "Years of service" },
  previewTitle: { ar: "معاينة قسيمة الراتب (شهر كامل بلا حضور)", en: "Payslip preview (full month, no attendance)" },
  previewNote: {
    ar: "تقدير قبل القروض والعقوبات والحضور — الأرقام الضريبية توضيحية.",
    en: "Estimate before loans, penalties and attendance — tax figures are illustrative.",
  },
  history: { ar: "السجل التاريخي", en: "Compensation history" },
  overrides: { ar: "التجاوزات / البنود المخصّصة للموظف", en: "Employee overrides / assigned components" },
  noOverrides: { ar: "لا توجد تجاوزات", en: "No overrides" },
  amount: { ar: "المبلغ", en: "Amount" },
  percent: { ar: "النسبة", en: "Percent" },
  related: { ar: "روابط ذات صلة", en: "Related" },
  loans: { ar: "السلف والقروض", en: "Loans & advances" },
  penalties: { ar: "العقوبات", en: "Penalties" },
  payslips: { ar: "قسائم الرواتب", en: "Payslips" },
  soon: { ar: "يُبنى لاحقاً", en: "Built later" },
  audit: { ar: "سجل الحركات", en: "Activity log" },
  assign: { ar: "تعيين راتب جديد", en: "Assign new salary" },
  increment: { ar: "تطبيق علاوة", en: "Apply increment" },
  promotion: { ar: "ترفيع", en: "Promote" },
  reason: { ar: "السبب", en: "Reason" },
  notFound: { ar: "الموظف غير موجود", en: "Employee not found" },
  backToList: { ar: "العودة للائحة التعويضات", en: "Back to compensation list" },
  incrementTitle: { ar: "تطبيق علاوة سنوية", en: "Apply annual increment" },
  incrementBody: {
    ar: "ينقل الموظف إلى المرحلة التالية بالدرجة نفسها ويضيف العلاوة السنوية للعلاوة المتراكمة، بسجل جديد.",
    en: "Moves the employee to the next step of the same grade and adds the grade's increment to the accumulated increment, as a new record.",
  },
  promotionTitle: { ar: "ترفيع الموظف", en: "Promote employee" },
  promotionBody: {
    ar: "ينقل الموظف إلى درجة أعلى (الدرجة 1 هي الأعلى) بسجل جديد.",
    en: "Moves the employee to a higher grade (grade 1 is the highest) as a new record.",
  },
  targetGrade: { ar: "الدرجة المستهدفة", en: "Target grade" },
  targetStep: { ar: "المرحلة", en: "Step" },
  from: { ar: "من", en: "From" },
  to: { ar: "إلى", en: "To" },
  governmentOnly: { ar: "متاحة للقطاع الحكومي فقط", en: "Available for government staff only" },
  apply: { ar: "تطبيق", en: "Apply" },
  amountColumn: { ar: "المبلغ", en: "Amount" },
} as const satisfies LabelMap;

export const compFormLabels = {
  title: { ar: "تعيين راتب جديد", en: "Assign new salary" },
  subtitle: { ar: "يسري اعتباراً من تاريخ ويغلق السجل الحالي تلقائياً", en: "Takes effect from a date and auto-closes the current record" },
  profile: { ar: "الملف", en: "Profile" },
  structure: { ar: "هيكل الراتب", en: "Salary structure" },
  effectiveFrom: { ar: "يسري من", en: "Effective from" },
  gradeStep: { ar: "الدرجة والمرحلة", en: "Grade and step" },
  grade: { ar: "الدرجة", en: "Grade" },
  step: { ar: "المرحلة", en: "Step" },
  nominalHint: { ar: "الراتب الاسمي المشتق", en: "Derived nominal salary" },
  baseSalary: { ar: "الأجر الأساسي (تعاقدي)", en: "Base salary (contractual)" },
  minHint: { ar: "الحد الأدنى للأجور", en: "Minimum wage" },
  paymentMethod: { ar: "طريقة الدفع", en: "Payment method" },
  bankAccount: { ar: "رقم الحساب المصرفي", en: "Bank account number" },
  maritalStatus: { ar: "الحالة الاجتماعية (ضريبياً)", en: "Marital status (tax)" },
  children: { ar: "عدد الأطفال المستحقين", en: "Eligible children" },
  pensionExempt: { ar: "مستثنى من التقاعد/الضمان", en: "Exempt from pension / SS" },
  reason: { ar: "سبب التغيير", en: "Change reason" },
  overrides: { ar: "البنود المخصّصة للموظف", en: "Components assigned to the employee" },
  overridesHint: {
    ar: "الهيكل قائمة بنود مسموحة؛ اختر منها ما يستحقه الموظف وحدّد مبلغه أو نسبته.",
    en: "The structure is a menu of allowed components; pick what applies to this employee and set an amount or percentage.",
  },
  addComponent: { ar: "إضافة بند", en: "Add component" },
  remove: { ar: "إزالة", en: "Remove" },
  livePreview: { ar: "معاينة حيّة", en: "Live preview" },
  submit: { ar: "حفظ التعيين", en: "Save assignment" },
  autoClose: { ar: "سيُغلق السجل الحالي بتاريخ", en: "The current record will close on" },
  prefilled: { ar: "القيم مأخوذة من السجل الحالي وقابلة للتعديل", en: "Values are prefilled from the current record and editable" },
  derivedFromHr: { ar: "افتراضي من HR", en: "Defaulted from HR" },
  validationFailed: { ar: "تعذّر الحفظ — راجع الحقول المظلّلة", en: "Could not save — review the highlighted fields" },
  autoAmount: { ar: "تلقائي", en: "Auto" },
  perChild: { ar: "لكل طفل", en: "per child" },
  automatic: { ar: "يُحتسب تلقائياً من الحالة الاجتماعية والأطفال", en: "Calculated automatically from marital status and children" },
} as const satisfies LabelMap;

export const importLabels = {
  title: { ar: "استيراد الرواتب من Excel", en: "Import salaries from Excel" },
  mockNotice: {
    ar: "تجربة توضيحية — الملف لا يُعالَج فعلياً ولا تُكتب أي بيانات.",
    en: "Demonstration only — the file is not really processed and no data is written.",
  },
  step1: { ar: "رفع الملف", en: "Upload" },
  step2: { ar: "مطابقة الأعمدة", en: "Map columns" },
  step3: { ar: "النتيجة", en: "Result" },
  pick: { ar: "اختر ملف Excel (محاكاة)", en: "Choose an Excel file (simulated)" },
  useSample: { ar: "استخدام ملف تجريبي", en: "Use sample file" },
  sourceColumn: { ar: "عمود الملف", en: "File column" },
  sampleValue: { ar: "قيمة نموذجية", en: "Sample value" },
  targetField: { ar: "الحقل في النظام", en: "System field" },
  rows: { ar: "الصفوف", en: "Rows" },
  next: { ar: "التالي", en: "Next" },
  back: { ar: "السابق", en: "Back" },
  import: { ar: "بدء الاستيراد", en: "Start import" },
  importing: { ar: "جارٍ الاستيراد...", en: "Importing..." },
  success: { ar: "صفوف ناجحة", en: "Rows imported" },
  failed: { ar: "صفوف بها أخطاء", en: "Rows with errors" },
  row: { ar: "الصف", en: "Row" },
  error: { ar: "الخطأ", en: "Error" },
  done: { ar: "إنهاء", en: "Done" },
  restart: { ar: "استيراد ملف آخر", en: "Import another file" },
  mapped: { ar: "مطابَق", en: "Mapped" },
  ignored: { ar: "تجاهل", en: "Ignore" },
  fields: {
    employeeCode: { ar: "الرقم الوظيفي", en: "Employee code" },
    profileId: { ar: "الملف", en: "Profile" },
    grade: { ar: "الدرجة", en: "Grade" },
    step: { ar: "المرحلة", en: "Step" },
    baseSalary: { ar: "الأجر الأساسي", en: "Base salary" },
    effectiveFrom: { ar: "يسري من", en: "Effective from" },
    paymentMethod: { ar: "طريقة الدفع", en: "Payment method" },
  },
} as const;
