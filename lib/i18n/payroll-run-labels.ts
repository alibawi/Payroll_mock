import type { Locale } from "@/components/locale-provider";
import type { StatusTone } from "@/components/status-badge";

type LabelMap = Record<string, Record<Locale, string>>;

// Labels of module 5 — payroll periods, inputs, runs and payslips.

export const runStatusLabels = {
  Draft: { ar: "مسودة", en: "Draft" },
  Calculated: { ar: "محتسبة", en: "Calculated" },
  PendingApproval: { ar: "بانتظار الاعتماد", en: "Pending approval" },
  Approved: { ar: "معتمدة", en: "Approved" },
  Posted: { ar: "مرحّلة", en: "Posted" },
  Paid: { ar: "مدفوعة", en: "Paid" },
  Reversed: { ar: "معكوسة", en: "Reversed" },
} as const satisfies LabelMap;

export const runStatusTones: Record<keyof typeof runStatusLabels, StatusTone> = {
  Draft: "neutral",
  Calculated: "info",
  PendingApproval: "warning",
  Approved: "info",
  Posted: "success",
  Paid: "success",
  Reversed: "destructive",
};

export const runTypeLabels = {
  Regular: { ar: "عادية", en: "Regular" },
  OffCycle: { ar: "خارج الدورة", en: "Off-cycle" },
  Bonus: { ar: "مكافآت", en: "Bonus" },
  Adjustment: { ar: "تسوية", en: "Adjustment" },
} as const satisfies LabelMap;

export const periodStatusLabels = {
  Open: { ar: "مفتوحة", en: "Open" },
  Locked: { ar: "مقفلة", en: "Locked" },
  Closed: { ar: "مغلقة", en: "Closed" },
} as const satisfies LabelMap;

export const periodStatusTones: Record<keyof typeof periodStatusLabels, StatusTone> = {
  Open: "success",
  Locked: "warning",
  Closed: "neutral",
};

export const inputStatusLabels = {
  Pending: { ar: "معلّق", en: "Pending" },
  Applied: { ar: "مطبّق", en: "Applied" },
  Cancelled: { ar: "ملغى", en: "Cancelled" },
} as const satisfies LabelMap;

export const inputStatusTones: Record<keyof typeof inputStatusLabels, StatusTone> = {
  Pending: "warning",
  Applied: "success",
  Cancelled: "destructive",
};

export const runActionLabels = {
  calculate: { ar: "احتساب", en: "Calculate" },
  recalculate: { ar: "إعادة احتساب", en: "Recalculate" },
  submit: { ar: "إرسال للاعتماد", en: "Submit for approval" },
  approve: { ar: "اعتماد", en: "Approve" },
  reject: { ar: "رفض", en: "Reject" },
  post: { ar: "ترحيل", en: "Post" },
  pay: { ar: "دفع", en: "Pay" },
  reverse: { ar: "عكس", en: "Reverse" },
  delete: { ar: "حذف الدورة", en: "Delete run" },
} as const satisfies LabelMap;

export const runActivityLabels = {
  Created: { ar: "إنشاء", en: "Created" },
  Calculated: { ar: "احتساب", en: "Calculated" },
  Recalculated: { ar: "إعادة احتساب", en: "Recalculated" },
  Submitted: { ar: "إرسال", en: "Submitted" },
  Approved: { ar: "اعتماد", en: "Approved" },
  Rejected: { ar: "رفض", en: "Rejected" },
  Posted: { ar: "ترحيل", en: "Posted" },
  Paid: { ar: "دفع", en: "Paid" },
  Reversed: { ar: "عكس", en: "Reversed" },
  Deleted: { ar: "حذف", en: "Deleted" },
  Comment: { ar: "تعليق", en: "Comment" },
} as const satisfies LabelMap;

export const warningSeverityLabels = {
  Blocker: { ar: "مانع", en: "Blocker" },
  Warning: { ar: "تحذير", en: "Warning" },
  Info: { ar: "معلومة", en: "Info" },
} as const satisfies LabelMap;

export const warningSeverityTones: Record<"Blocker" | "Warning" | "Info", StatusTone> = {
  Blocker: "destructive",
  Warning: "warning",
  Info: "neutral",
};

export const warningCodeLabels = {
  NO_COMPENSATION: { ar: "بلا تعويض", en: "No compensation" },
  NET_PROTECTION_SPREAD: { ar: "حماية الصافي — ترحيل", en: "Net protection — carried forward" },
  NET_PROTECTION_BLOCK: { ar: "حماية الصافي — إيقاف", en: "Net protection — blocked" },
  NEGATIVE_NET: { ar: "صافٍ سالب", en: "Negative net" },
  STATUTORY_CONFIG_MISSING: { ar: "إعداد قانوني ناقص", en: "Statutory setting missing" },
  TAX_CONFIG_MISSING: { ar: "إعداد ضريبة ناقص", en: "Tax setting missing" },
  PRORATED: { ar: "راتب نسبي", en: "Prorated pay" },
  NO_ATTENDANCE: { ar: "بلا بيانات حضور", en: "No attendance data" },
  BELOW_MINIMUM_WAGE: { ar: "دون الحد الأدنى للأجور", en: "Below minimum wage" },
  SUPPLEMENTARY_NO_TAX: { ar: "دورة تكميلية", en: "Supplementary run" },
} as const satisfies LabelMap;

export const scheduleSourceLabels = {
  EmployeeLoan: { ar: "قسط سلفة/قرض", en: "Loan instalment" },
  DisciplinaryPenalty: { ar: "قسط عقوبة", en: "Penalty instalment" },
  CourtOrder: { ar: "أمر قضائي", en: "Court order" },
  Manual: { ar: "استقطاع يدوي", en: "Manual deduction" },
} as const satisfies LabelMap;

export const scheduleStatusLabels = {
  Planned: { ar: "مخطّط", en: "Planned" },
  Applied: { ar: "مستقطع", en: "Applied" },
  Released: { ar: "محرَّر", en: "Released" },
} as const satisfies LabelMap;

export const paidStatusLabels = {
  Unpaid: { ar: "غير مدفوع", en: "Unpaid" },
  Paid: { ar: "مدفوع", en: "Paid" },
  Failed: { ar: "فشل الدفع", en: "Failed" },
} as const satisfies LabelMap;

export const paidStatusTones: Record<"Unpaid" | "Paid" | "Failed", StatusTone> = {
  Unpaid: "warning",
  Paid: "success",
  Failed: "destructive",
};

export const paymentMethodLabels = {
  Bank: { ar: "تحويل مصرفي", en: "Bank transfer" },
  Cash: { ar: "نقداً", en: "Cash" },
} as const satisfies LabelMap;

export const comparisonKindLabels = {
  new: { ar: "جديد بالدورة", en: "New in this run" },
  left: { ar: "غير موجود بالدورة", en: "Not in this run" },
  changed: { ar: "تغيّر الصافي", en: "Net changed" },
  same: { ar: "بلا تغيير", en: "Unchanged" },
} as const satisfies LabelMap;

export const periodListLabels = {
  searchPlaceholder: { ar: "بحث بالفترة", en: "Search by period" },
  period: { ar: "الفترة", en: "Period" },
  profile: { ar: "الملف", en: "Profile" },
  year: { ar: "السنة", en: "Year" },
  month: { ar: "الشهر", en: "Month" },
  range: { ar: "من — إلى", en: "From — to" },
  cutoff: { ar: "تاريخ القطع", en: "Cut-off" },
  payDate: { ar: "تاريخ الدفع", en: "Pay date" },
  status: { ar: "الحالة", en: "Status" },
  runs: { ar: "الدورات", en: "Runs" },
  mainRun: { ar: "الدورة الأساسية", en: "Main run" },
  pendingInputs: { ar: "مدخلات معلّقة", en: "Pending inputs" },
  newPeriod: { ar: "فترة جديدة", en: "New period" },
  newPeriodDescription: { ar: "فترة رواتب شهرية جديدة لأحد الملفين", en: "A new monthly payroll period for one of the profiles" },
  create: { ar: "إنشاء الفترة", en: "Create period" },
  kpiOpen: { ar: "فترات مفتوحة", en: "Open periods" },
  kpiLocked: { ar: "مقفلة بانتظار الدفع", en: "Locked, awaiting payment" },
  kpiClosed: { ar: "فترات مغلقة", en: "Closed periods" },
  kpiPending: { ar: "مدخلات معلّقة", en: "Pending inputs" },
  empty: { ar: "لا توجد فترات", en: "No periods" },
  all: { ar: "الكل", en: "All" },
  noRun: { ar: "لا توجد دورة", en: "No run yet" },
  weeklyDaily: { ar: "أسبوعي ويومي — قيد التطوير", en: "Weekly and daily — in development" },
  periodType: { ar: "نوع الفترة", en: "Period type" },
  monthly: { ar: "شهرية", en: "Monthly" },
  lifecycle: { ar: "الفترة تُقفل عند اعتماد الدورة الأساسية وتُغلق عند الدفع، وتُعاد فتحها عند العكس.", en: "A period locks when its main run is approved, closes when it is paid and re-opens on reversal." },
} as const satisfies LabelMap;

export const inputListLabels = {
  searchPlaceholder: { ar: "بحث بالموظف أو السبب", en: "Search by employee or reason" },
  employee: { ar: "الموظف", en: "Employee" },
  component: { ar: "البند", en: "Component" },
  period: { ar: "الفترة", en: "Period" },
  amount: { ar: "المبلغ", en: "Amount" },
  quantity: { ar: "الكمية", en: "Quantity" },
  reason: { ar: "السبب", en: "Reason" },
  status: { ar: "الحالة", en: "Status" },
  run: { ar: "الدورة", en: "Run" },
  type: { ar: "النوع", en: "Type" },
  newInput: { ar: "مدخل جديد", en: "New input" },
  newInputDescription: { ar: "مكافأة أو تسوية أو استقطاع لمرة واحدة يلتقطه احتساب الدورة", en: "A one-off bonus, adjustment or deduction picked up by the next calculation" },
  create: { ar: "حفظ المدخل", en: "Save input" },
  retro: { ar: "تسوية بأثر رجعي", en: "Retroactive adjustment" },
  retroHint: { ar: "الاحتساب بأثر رجعي غير مدعوم — تُسجَّل الفروقات هنا يدوياً (R-11)", en: "Retroactive calculation is not supported — record the differences here manually (R-11)" },
  tabAll: { ar: "الكل", en: "All" },
  tabPending: { ar: "معلّقة", en: "Pending" },
  tabApplied: { ar: "مطبّقة", en: "Applied" },
  tabCancelled: { ar: "ملغاة", en: "Cancelled" },
  cancelInput: { ar: "إلغاء المدخل", en: "Cancel input" },
  cancelBody: { ar: "سيُلغى هذا المدخل ولن يلتقطه الاحتساب.", en: "This input will be cancelled and no calculation will pick it up." },
  earning: { ar: "استحقاق", en: "Earning" },
  deduction: { ar: "استقطاع", en: "Deduction" },
  empty: { ar: "لا توجد مدخلات", en: "No inputs" },
  heldBy: { ar: "محجوز بالدورة", en: "Held by run" },
  selectComponent: { ar: "اختر البند", en: "Select component" },
  kpiPending: { ar: "معلّقة", en: "Pending" },
  kpiPendingAmount: { ar: "قيمة المعلّقة", en: "Pending value" },
  kpiApplied: { ar: "مطبّقة", en: "Applied" },
  kpiRetro: { ar: "تسويات رجعية", en: "Retro adjustments" },
} as const satisfies LabelMap;

export const runListLabels = {
  searchPlaceholder: { ar: "بحث برقم الدورة", en: "Search by run number" },
  runNo: { ar: "الرقم", en: "No." },
  period: { ar: "الفترة", en: "Period" },
  profile: { ar: "الملف", en: "Profile" },
  type: { ar: "النوع", en: "Type" },
  employees: { ar: "الموظفون", en: "Employees" },
  gross: { ar: "الإجمالي", en: "Gross" },
  net: { ar: "الصافي", en: "Net" },
  status: { ar: "الحالة", en: "Status" },
  alerts: { ar: "تنبيهات", en: "Alerts" },
  newRun: { ar: "دورة جديدة", en: "New run" },
  tabAll: { ar: "الكل", en: "All" },
  tabDraft: { ar: "مسودة", en: "Draft" },
  tabCalculated: { ar: "محتسبة", en: "Calculated" },
  tabPending: { ar: "بانتظار الاعتماد", en: "Pending approval" },
  tabApproved: { ar: "معتمدة", en: "Approved" },
  tabPosted: { ar: "مرحّلة", en: "Posted" },
  tabPaid: { ar: "مدفوعة", en: "Paid" },
  tabReversed: { ar: "معكوسة", en: "Reversed" },
  empty: { ar: "لا توجد دورات", en: "No runs" },
  kpiGross: { ar: "إجمالي الدورة الحالية", en: "Current gross" },
  kpiNet: { ar: "صافي الدورة الحالية", en: "Current net" },
  kpiEmployerCost: { ar: "كلفة صاحب العمل", en: "Employer cost" },
  kpiWaiting: { ar: "دورات بانتظار إجراء", en: "Runs awaiting action" },
  vsPrevious: { ar: "مقارنة بالشهر السابق", en: "vs previous month" },
  allPeriods: { ar: "كل الفترات", en: "All periods" },
  blockers: { ar: "مانع", en: "blocker" },
  warnings: { ar: "تحذير", en: "warning" },
  deptScope: { ar: "تُعرض الأرقام الإجمالية دون مبالغ الأفراد.", en: "Totals are shown without individual amounts." },
} as const satisfies LabelMap;

export const runFormLabels = {
  title: { ar: "دورة رواتب جديدة", en: "New payroll run" },
  description: { ar: "اختر الملف والفترة ونوع الدورة ونطاقها، ثم احتسبها من صفحة الدورة", en: "Pick the profile, period, run type and scope, then calculate it from the run page" },
  profile: { ar: "الملف", en: "Profile" },
  period: { ar: "الفترة", en: "Period" },
  runType: { ar: "نوع الدورة", en: "Run type" },
  scope: { ar: "النطاق", en: "Scope" },
  scopeHint: { ar: "اتركه فارغاً لتشمل الدورة كل موظفي الملف", en: "Leave empty to cover every employee of the profile" },
  departments: { ar: "الأقسام", en: "Departments" },
  costCenters: { ar: "مراكز الكلفة", en: "Cost centres" },
  employees: { ar: "الموظفون", en: "Employees" },
  note: { ar: "ملاحظة", en: "Note" },
  create: { ar: "إنشاء الدورة", en: "Create run" },
  noOpenPeriod: { ar: "لا توجد فترة مفتوحة لهذا الملف — أنشئ فترة أولاً", en: "No open period for this profile — create one first" },
  regularHint: { ar: "الدورة العادية: هيكل الراتب + الحضور + السلف والعقوبات + المدخلات", en: "Regular run: salary structure + attendance + loans and penalties + inputs" },
  supplementaryHint: { ar: "الدورة التكميلية: المدخلات المعلّقة فقط، بلا ضريبة أو تأمين (موك أب)", en: "Supplementary run: pending inputs only, no tax or insurance (mock)" },
  selectedEmployees: { ar: "موظفون محددون", en: "Selected employees" },
  addEmployee: { ar: "إضافة موظف", en: "Add employee" },
  pickProfile: { ar: "اختر الملف", en: "Pick a profile" },
  pickPeriod: { ar: "اختر الفترة", en: "Pick a period" },
} as const satisfies LabelMap;

export const runDetailLabels = {
  notFound: { ar: "الدورة غير موجودة", en: "Run not found" },
  backToList: { ar: "العودة للدورات", en: "Back to runs" },
  tabPayslips: { ar: "القسائم", en: "Payslips" },
  tabComparison: { ar: "المقارنة بالسابقة", en: "Comparison" },
  tabWarnings: { ar: "التحذيرات", en: "Warnings" },
  tabDeductions: { ar: "الاستقطاعات المستحقة", en: "Scheduled deductions" },
  tabJournal: { ar: "القيد المحاسبي", en: "Journal" },
  tabActivity: { ar: "سجل الحركات", en: "Activity" },
  employee: { ar: "الموظف", en: "Employee" },
  department: { ar: "القسم", en: "Department" },
  gross: { ar: "الإجمالي (Gross)", en: "Gross pay" },
  deductions: { ar: "الاستقطاعات", en: "Deductions" },
  net: { ar: "الصافي", en: "Net pay" },
  employerCost: { ar: "كلفة صاحب العمل", en: "Employer cost" },
  employees: { ar: "الموظفون", en: "Employees" },
  paid: { ar: "الدفع", en: "Payment" },
  flags: { ar: "ملاحظات", en: "Flags" },
  profile: { ar: "الملف", en: "Profile" },
  period: { ar: "الفترة", en: "Period" },
  type: { ar: "النوع", en: "Type" },
  scope: { ar: "النطاق", en: "Scope" },
  allEmployees: { ar: "كل موظفي الملف", en: "All employees of the profile" },
  journalRef: { ar: "رقم القيد", en: "Journal ref" },
  paymentRef: { ar: "سند الدفع", en: "Payment voucher" },
  calculatedAt: { ar: "آخر احتساب", en: "Last calculated" },
  approvedBy: { ar: "اعتمدها", en: "Approved by" },
  claimedInputs: { ar: "مدخلات ملتقطة", en: "Inputs picked up" },
  rejection: { ar: "سبب الرفض", en: "Rejection reason" },
  reversalReason: { ar: "سبب العكس", en: "Reversal reason" },
  replacedBy: { ar: "أُعيدت بالدورة", en: "Redone by run" },
  noPayslips: { ar: "لا توجد قسائم — احتسب الدورة أولاً", en: "No payslips yet — calculate the run first" },
  notCalculated: { ar: "لم تُحتسب الدورة بعد", en: "The run has not been calculated yet" },
  noWarnings: { ar: "لا توجد تحذيرات", en: "No warnings" },
  noSchedule: { ar: "لا توجد استقطاعات مستحقة", en: "No scheduled deductions" },
  noJournal: { ar: "لا يوجد قيد — احتسب الدورة أولاً", en: "No journal — calculate the run first" },
  previewJournal: { ar: "معاينة القيد (لم يُرحَّل بعد)", en: "Journal preview (not posted yet)" },
  postingEntry: { ar: "قيد الترحيل", en: "Posting entry" },
  paymentEntry: { ar: "قيد الدفع", en: "Payment entry" },
  reversalEntry: { ar: "القيد العكسي", en: "Reversal entry" },
  costCentre: { ar: "مركز الكلفة", en: "Cost centre" },
  balanced: { ar: "متوازن", en: "Balanced" },
  unbalanced: { ar: "غير متوازن", en: "Unbalanced" },
  source: { ar: "المصدر", en: "Source" },
  reference: { ar: "المرجع", en: "Reference" },
  due: { ar: "المستحق", en: "Due" },
  applied: { ar: "المستقطع", en: "Applied" },
  deferred: { ar: "المرحَّل", en: "Carried forward" },
  status: { ar: "الحالة", en: "Status" },
  severity: { ar: "الخطورة", en: "Severity" },
  message: { ar: "الرسالة", en: "Message" },
  code: { ar: "النوع", en: "Type" },
  current: { ar: "الحالية", en: "Current" },
  previous: { ar: "السابقة", en: "Previous" },
  diff: { ar: "الفرق", en: "Difference" },
  pct: { ar: "٪", en: "%" },
  comparedWith: { ar: "مقارنة مع", en: "Compared with" },
  noPrevious: { ar: "لا توجد دورة سابقة مرحّلة للمقارنة", en: "No earlier posted run to compare with" },
  flaggedNote: { ar: "تُميَّز حالات تغيّر الصافي بأكثر من 10٪ والموظفون الجدد/المغادرون (R-5)", en: "Net changes above 10% and joiners/leavers are highlighted (R-5)" },
  onlyFlagged: { ar: "المميّزة فقط", en: "Flagged only" },
  addComment: { ar: "إضافة تعليق", en: "Add a comment" },
  send: { ar: "إرسال", en: "Send" },
  commentPlaceholder: { ar: "اكتب تعليقاً...", en: "Write a comment..." },
  openPayslip: { ar: "فتح القسيمة", en: "Open payslip" },
  spread: { ar: "ترحيل", en: "Carried" },
  blocked: { ar: "موقوف", en: "Blocked" },
  period_locked: { ar: "الفترة", en: "Period" },
} as const satisfies LabelMap;



export const runBannerLabels = {
    Draft: { ar: "مسودة — اضغط «احتساب» لتوليد القسائم من التعويضات والحضور والسلف والعقوبات والمدخلات.", en: "Draft — press “Calculate” to build payslips from compensation, attendance, loans, penalties and inputs." },
    Calculated: { ar: "الدورة محتسبة. راجع المقارنة والتحذيرات ثم أرسلها للاعتماد، أو أعد الاحتساب بعد تعديل المدخلات.", en: "The run is calculated. Review the comparison and warnings, then submit it — or recalculate after changing inputs." },
    PendingApproval: { ar: "بانتظار اعتماد مدير الموارد البشرية.", en: "Waiting for the HR manager's approval." },
    Approved: { ar: "معتمدة — الترحيل المحاسبي بيد المحاسب المالي (تُقفل الفترة باعتماد الدورة العادية).", en: "Approved — posting belongs to the finance accountant (a regular run locks its period when approved)." },
    Posted: { ar: "مرحّلة ومقيّدة محاسبياً. الدفع أو العكس بيد المحاسب المالي.", en: "Posted to the ledger. Payment or reversal belongs to the finance accountant." },
    Paid: { ar: "مدفوعة والفترة مغلقة. العكس يتطلب إلغاء الدفع أولاً (غير متاح بالموك أب).", en: "Paid and the period is closed. Reversal needs the payment cancelled first (not available in the mock)." },
    Reversed: { ar: "معكوسة: قُيِّد القيد العكسي وأُعيدت الأقساط والمدخلات للانتظار.", en: "Reversed: the reversing entry is booked and instalments and inputs are back to pending." },
} as const satisfies LabelMap;

export const runDialogLabels = {
  calculateTitle: { ar: "احتساب الدورة", en: "Calculate the run" },
  calculateBody: { ar: "ستُولَّد القسائم من جديد بالأرقام الحالية (التعويضات، الحضور، الأقساط المستحقة، المدخلات المعلّقة).", en: "Payslips will be rebuilt from the current numbers (compensation, attendance, due instalments, pending inputs)." },
  submitTitle: { ar: "إرسال للاعتماد", en: "Submit for approval" },
  submitBody: { ar: "ستنتقل الدورة إلى «بانتظار الاعتماد» ولا يمكن تعديلها إلا برفضها.", en: "The run moves to “Pending approval” and can only be changed by rejecting it." },
  approveTitle: { ar: "اعتماد الدورة", en: "Approve the run" },
  approveBody: { ar: "عند الاعتماد تُقفل الفترة ولا يُعاد احتساب الدورة.", en: "Approving locks the period and the run can no longer be recalculated." },
  rejectTitle: { ar: "رفض الاعتماد", en: "Reject approval" },
  rejectBody: { ar: "تعود الدورة إلى «محتسبة» مع سبب الرفض لمراجعته.", en: "The run returns to “Calculated” with the reason for review." },
  rejectReason: { ar: "سبب الرفض", en: "Rejection reason" },
  postTitle: { ar: "ترحيل الدورة", en: "Post the run" },
  postBody: { ar: "راجع القيد المحاسبي. عند التأكيد تُستقطع الأقساط وتُطبَّق المدخلات.", en: "Review the journal entry. Confirming deducts the instalments and applies the inputs." },
  payTitle: { ar: "دفع الرواتب", en: "Pay salaries" },
  payBody: { ar: "يُنشأ سند دفع وهمي يقفل «رواتب مستحقة الدفع» ويحدّث حالة الدفع بالقسائم.", en: "A mock payment voucher closes “Net salaries payable” and updates each payslip's paid status." },
  reverseTitle: { ar: "عكس الدورة", en: "Reverse the run" },
  reverseBody: { ar: "يُقيَّد قيد عكسي، وتعود الأقساط والمدخلات للانتظار، وتُعاد فتح الفترة.", en: "A reversing entry is booked, instalments and inputs return to pending and the period re-opens." },
  reverseReason: { ar: "سبب العكس", en: "Reversal reason" },
  deleteTitle: { ar: "حذف الدورة", en: "Delete the run" },
  deleteBody: { ar: "ستُحذف الدورة وقسائمها وتُحرَّر المدخلات التي التقطتها.", en: "The run and its payslips are deleted and the inputs it picked up are released." },
  confirm: { ar: "تأكيد", en: "Confirm" },
  working: { ar: "جارٍ التنفيذ...", en: "Working..." },
  journalRef: { ar: "رقم القيد", en: "Journal ref" },
  paymentRef: { ar: "سند الدفع", en: "Payment voucher" },
  bank: { ar: "تحويل مصرفي", en: "Bank transfer" },
  cash: { ar: "نقداً", en: "Cash" },
  payslipsCount: { ar: "قسيمة", en: "payslips" },
  total: { ar: "الإجمالي", en: "Total" },
  blockersBody: { ar: "لا يمكن إرسال/اعتماد الدورة وفيها تحذيرات مانعة (R-4).", en: "A run with blocking warnings cannot be submitted or approved (R-4)." },
} as const satisfies LabelMap;

export const payslipPageLabels = {
  notFound: { ar: "القسيمة غير موجودة", en: "Payslip not found" },
  backToRun: { ar: "العودة للدورة", en: "Back to the run" },
  attendance: { ar: "الحضور والوقت", en: "Attendance and time" },
  workedDays: { ar: "أيام العمل الفعلية", en: "Worked days" },
  paidLeave: { ar: "إجازة مدفوعة", en: "Paid leave days" },
  unpaidLeave: { ar: "إجازة بلا راتب", en: "Unpaid leave days" },
  absence: { ar: "أيام الغياب", en: "Absence days" },
  lateEvents: { ar: "أحداث التأخير", en: "Late arrivals" },
  lateMinutes: { ar: "دقائق التأخير", en: "Late minutes" },
  overtime: { ar: "ساعات إضافية", en: "Overtime hours" },
  dayRate: { ar: "معدّل اليوم", en: "Day rate" },
  bases: { ar: "الأوعية", en: "Bases" },
  pensionableBase: { ar: "وعاء التقاعد", en: "Pensionable base" },
  socialSecurityBase: { ar: "وعاء الضمان", en: "Social-security base" },
  taxableBase: { ar: "الوعاء الضريبي", en: "Taxable base" },
  attendanceDeductions: { ar: "خصومات الحضور", en: "Attendance deductions" },
  absenceDeduction: { ar: "خصم الغياب", en: "Absence deduction" },
  latenessDeduction: { ar: "خصم التأخير", en: "Lateness deduction" },
  grossEarnings: { ar: "إجمالي الاستحقاقات", en: "Gross earnings" },
  grossPay: { ar: "الإجمالي بعد الخصم", en: "Gross pay" },
  summary: { ar: "الملخّص", en: "Summary" },
  payment: { ar: "الدفع", en: "Payment" },
  method: { ar: "طريقة الدفع", en: "Method" },
  bankAccount: { ar: "الحساب المصرفي", en: "Bank account" },
  paymentDoc: { ar: "سند الدفع", en: "Payment voucher" },
  paidDate: { ar: "تاريخ الدفع", en: "Paid on" },
  vsPrevious: { ar: "مقارنة بالشهر السابق", en: "vs previous month" },
  trace: { ar: "شرح الاحتساب", en: "Calculation trace" },
  traceHint: { ar: "الخطوات حسب خط الحساب في الدراسة 8.3: كل رقم بصيغته.", en: "Steps follow the calculation line of study 8.3, each figure with its formula." },
  expandAll: { ar: "فتح الكل", en: "Expand all" },
  collapseAll: { ar: "طيّ الكل", en: "Collapse all" },
  deductionSources: { ar: "الأقساط خلف الاستقطاعات", en: "Instalments behind the deductions" },
  noSources: { ar: "لا استقطاعات من قروض أو عقوبات", en: "No loan or penalty deductions" },
  netProtection: { ar: "حماية الصافي", en: "Net protection" },
  employerContribution: { ar: "مساهمة صاحب العمل", en: "Employer contribution" },
  costCentre: { ar: "مركز الكلفة", en: "Cost centre" },
  print: { ar: "طباعة", en: "Print" },
  step: { ar: "الخطوة", en: "Step" },
} as const satisfies LabelMap;

export const myPayslipsLabels = {
  title: { ar: "قسائمي", en: "My payslips" },
  description: { ar: "قسائم الرواتب المرحّلة الخاصة بك", en: "Your posted payslips" },
  period: { ar: "الفترة", en: "Period" },
  run: { ar: "الدورة", en: "Run" },
  gross: { ar: "الإجمالي", en: "Gross" },
  deductions: { ar: "الاستقطاعات", en: "Deductions" },
  net: { ar: "الصافي", en: "Net" },
  paid: { ar: "الدفع", en: "Payment" },
  empty: { ar: "لا توجد قسائم مرحّلة", en: "No posted payslips" },
  roleNote: { ar: "تظهر هذه الصفحة لدور «موظف» (الموظف التجريبي أحمد...)", en: "This page is meant for the Employee role" },
} as const satisfies LabelMap;

export const goldenLabels = {
  title: { ar: "التحقق من الأمثلة الذهبية", en: "Golden example verification" },
  description: { ar: "شاشة مطوّر: تشغّل المحرك على أمثلة الدراسة 12.1–12.4 وتقارن النتيجة بأرقام الدراسة وبالقواعد الموثّقة (G2/G3).", en: "Developer screen: runs the engine over the study's examples 12.1–12.4 and compares the result with the study's figures and with the documented rules (G2/G3)." },
  rerun: { ar: "إعادة التشغيل", en: "Run again" },
  check: { ar: "البند", en: "Check" },
  study: { ar: "الدراسة", en: "Study" },
  expected: { ar: "المتوقع بالقواعد", en: "Expected by rules" },
  engine: { ar: "المحرك", en: "Engine" },
  result: { ar: "النتيجة", en: "Result" },
  match: { ar: "مطابق", en: "Match" },
  documented: { ar: "فرق موثّق", en: "Documented gap" },
  fail: { ar: "فشل", en: "Fail" },
  allPass: { ar: "كل الاختبارات الذهبية تمر", en: "All golden checks pass" },
  someFail: { ar: "بعض الاختبارات فشلت", en: "Some checks failed" },
  legend: {
    ar: "«فرق موثّق» = الرقم يختلف عن الدراسة لسبب معروف: G2 (شرائح الضريبة غير محددة بالدراسة وأرقامها غير متسقة) أو G3 (تقريب الأجر لأقرب 250 بدل تقريب الدراسة). المحرك يجب أن يطابق عمود «المتوقع بالقواعد» دائماً.",
    en: "“Documented gap” = the figure differs from the study for a known reason: G2 (the study does not define tax brackets and its tax figures are inconsistent) or G3 (wages round to 250 rather than the study's rounding). The engine must always equal the “Expected by rules” column.",
  },
  checks: { ar: "اختبار", en: "checks" },
  employee: { ar: "الموظف", en: "Employee" },
  ranAt: { ar: "آخر تشغيل", en: "Last run" },
} as const satisfies LabelMap;

export const runDashboardLabels = {
  section: { ar: "دورة الرواتب", en: "Payroll cycle" },
  currentPeriod: { ar: "الفترة الحالية", en: "Current period" },
  gross: { ar: "إجمالي الرواتب", en: "Gross payroll" },
  net: { ar: "صافي الرواتب", en: "Net payroll" },
  employerCost: { ar: "كلفة صاحب العمل", en: "Employer cost" },
  employees: { ar: "موظفون بالدورات", en: "Employees in runs" },
  waiting: { ar: "دورات بانتظار إجراء", en: "Runs awaiting action" },
  netProtection: { ar: "موظفون تحت حماية الصافي", en: "Employees under net protection" },
  pendingInputs: { ar: "مدخلات معلّقة", en: "Pending inputs" },
  trend: { ar: "اتجاه كلفة الرواتب (6 أشهر)", en: "Payroll cost trend (6 months)" },
  mix: { ar: "توزيع الاستقطاعات", en: "Deduction mix" },
  vsPrev: { ar: "عن الشهر السابق", en: "vs previous month" },
  tax: { ar: "ضريبة الدخل", en: "Income tax" },
  socialSecurity: { ar: "الضمان الاجتماعي", en: "Social security" },
  pension: { ar: "التقاعد", en: "Pension" },
  loans: { ar: "السلف والقروض", en: "Loans" },
  penalties: { ar: "العقوبات", en: "Penalties" },
  other: { ar: "أخرى", en: "Other" },
  calculated: { ar: "محتسبة", en: "calculated" },
  pendingApproval: { ar: "بانتظار الاعتماد", en: "pending approval" },
  approved: { ar: "معتمدة", en: "approved" },
  openRuns: { ar: "فتح الدورات", en: "Open runs" },
  golden: { ar: "التحقق من الأمثلة الذهبية (للمطوّر)", en: "Golden-example check (developers)" },
  noData: { ar: "لا بيانات", en: "No data" },
} as const satisfies LabelMap;
