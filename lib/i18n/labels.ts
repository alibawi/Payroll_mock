import type { Locale } from "@/components/locale-provider";

type LabelMap = Record<string, Record<Locale, string>>;

export const appLabels = {
  appName: { ar: "إنكي", en: "ENKI" },
  productName: { ar: "ENKI ERP", en: "ENKI ERP" },
  companyName: {
    ar: "شركة إنكي للحلول المتكاملة",
    en: "ENKI Integrated Solutions Co.",
  },
  welcome: { ar: "مرحباً بك في نظام إنكي", en: "Welcome to ENKI" },
  welcomeSubtitle: {
    ar: "نظامك الشامل لإدارة الأعمال",
    en: "Your complete business management system",
  },
  quickAccess: { ar: "وصول سريع", en: "Quick Access" },
  settings: { ar: "الإعدادات", en: "Settings" },
  language: { ar: "اللغة", en: "Language" },
} as const satisfies LabelMap;

/** Sidebar / Quick Access names. Payroll is the only live module; the rest are launcher decoration (docs/identity.md 2.1). */
export const moduleLabels = {
  administration: { ar: "الإدارة", en: "Administration" },
  shipping: { ar: "إدارة الشحن", en: "Shipping" },
  pos: { ar: "نقاط البيع", en: "Point of Sale" },
  sales: { ar: "المبيعات", en: "Sales" },
  market: { ar: "السوق", en: "Marketplace" },
  inventory: { ar: "إدارة المخزون", en: "Inventory" },
  hr: { ar: "إدارة الموارد البشرية", en: "Human Resources" },
  finance: { ar: "المالية", en: "Finance" },
  security: { ar: "أمان", en: "Security" },
  purchases: { ar: "المشتريات", en: "Purchasing" },
  archive: { ar: "الأرشيف", en: "Archive" },
  forms: { ar: "الاستمارات", en: "Forms" },
  crm: { ar: "إدارة العلاقات مع العملاء", en: "CRM" },
  projects: { ar: "إدارة المشاريع", en: "Projects" },
  manufacturing: { ar: "التصنيع", en: "Manufacturing" },
  payroll: { ar: "الرواتب", en: "Payroll" },
} as const satisfies LabelMap;

/** Launcher card titles + descriptions (the home page shows the longer card wording). */
export const moduleCardLabels = {
  administration: {
    title: { ar: "الإعدادات الأساسية", en: "Core Settings" },
    description: {
      ar: "إعدادات النظام والمستخدمين والبيانات الرئيسية",
      en: "System settings, users and master data",
    },
  },
  shipping: {
    title: { ar: "الشحن", en: "Shipping" },
    description: {
      ar: "تخطيط الشحنات والتتبع وإدارة اللوجستيات",
      en: "Shipment planning, tracking and logistics",
    },
  },
  pos: {
    title: { ar: "نقاط البيع", en: "Point of Sale" },
    description: {
      ar: "عمليات التجزئة وإدارة أجهزة البيع",
      en: "Retail operations and POS device management",
    },
  },
  sales: {
    title: { ar: "المبيعات", en: "Sales" },
    description: {
      ar: "إدارة أوامر المبيعات والفواتير وعلاقات العملاء",
      en: "Sales orders, invoices and customer relations",
    },
  },
  market: {
    title: { ar: "السوق الإلكتروني", en: "E-Marketplace" },
    description: {
      ar: "منصة التجارة الإلكترونية وإدارة المتجر الإلكتروني",
      en: "E-commerce platform and online store management",
    },
  },
  inventory: {
    title: { ar: "المخزون", en: "Inventory" },
    description: {
      ar: "تتبع مستويات المخزون والمستودعات وحركات الأصناف",
      en: "Stock levels, warehouses and item movements",
    },
  },
  hr: {
    title: { ar: "الموارد البشرية", en: "Human Resources" },
    description: {
      ar: "إدارة الموظفين والرواتب والهيكل التنظيمي",
      en: "Employees, positions and organisational structure",
    },
  },
  finance: {
    title: { ar: "المالية", en: "Finance" },
    description: {
      ar: "إدارة المحاسبة والقيود والتقارير المالية",
      en: "Accounting, journal entries and financial reports",
    },
  },
  security: {
    title: { ar: "أمان", en: "Security" },
    description: {
      ar: "إدارة التأمينات والوثائق والشراكات",
      en: "Insurance, documents and partnerships",
    },
  },
  purchases: {
    title: { ar: "المشتريات", en: "Purchasing" },
    description: {
      ar: "إدارة أوامر الشراء والموردين والاستلام",
      en: "Purchase orders, suppliers and receiving",
    },
  },
  archive: {
    title: { ar: "الأرشيف", en: "Archive" },
    description: {
      ar: "إدارة المستندات وتخزين الملفات",
      en: "Document management and file storage",
    },
  },
  forms: {
    title: { ar: "النماذج الديناميكية", en: "Dynamic Forms" },
    description: {
      ar: "إنشاء وإدارة النماذج الديناميكية والاستبيانات",
      en: "Create and manage dynamic forms and surveys",
    },
  },
  crm: {
    title: { ar: "إدارة العملاء", en: "Customer Management" },
    description: {
      ar: "إدارة علاقات العملاء والمشاركة",
      en: "Customer relations and engagement",
    },
  },
  projects: {
    title: { ar: "إدارة المشاريع", en: "Project Management" },
    description: {
      ar: "تخطيط وتتبع وإدارة المشاريع",
      en: "Plan, track and manage projects",
    },
  },
  manufacturing: {
    title: { ar: "التصنيع", en: "Manufacturing" },
    description: {
      ar: "إدارة خطوط الإنتاج وعملياتها",
      en: "Production lines and operations",
    },
  },
  payroll: {
    title: { ar: "الرواتب", en: "Payroll" },
    description: {
      ar: "إدارة الرواتب والاستقطاعات والسلف وقسائم الدفع",
      en: "Payroll, deductions, loans and payslips",
    },
  },
} as const satisfies Record<
  keyof typeof moduleLabels,
  { title: Record<Locale, string>; description: Record<Locale, string> }
>;

export const roleLabels = {
  hrManager: { ar: "مدير الموارد البشرية", en: "HR Manager" },
  payrollOfficer: { ar: "مسؤول الرواتب", en: "Payroll Officer" },
  financeAccountant: { ar: "محاسب مالي", en: "Finance Accountant" },
  deptHead: { ar: "مسؤول قسم", en: "Department Head" },
  employee: { ar: "موظف", en: "Employee" },
} as const satisfies LabelMap;

/** One-line description of what each mock role can do (docs/roadmap.md 4) — shown on /login. */
export const roleDescriptions = {
  hrManager: {
    ar: "يعتمد الدورات والقروض والعقوبات ويراجع المرجعيات",
    en: "Approves runs, loans and penalties; reviews configuration",
  },
  payrollOfficer: {
    ar: "يدير المرجعيات والتعويض والمدخلات ويحتسب الدورات",
    en: "Manages configuration, compensation and inputs; calculates runs",
  },
  financeAccountant: {
    ar: "يرحّل القيود ويعكسها ويتابع الدفع والتوريد",
    en: "Posts and reverses journals; tracks payment and remittances",
  },
  deptHead: {
    ar: "يقدّم طلبات السلف والعقوبات ويطّلع على ملخص قسمه",
    en: "Requests loans and penalties; views the department summary",
  },
  employee: {
    ar: "خدمة ذاتية: قسائمي وسلفي وطلب سلفة جديدة",
    en: "Self-service: my payslips, my loans, new advance request",
  },
} as const satisfies LabelMap;

export const loginLabels = {
  title: { ar: "تسجيل الدخول", en: "Sign in" },
  subtitle: { ar: "اختر دورك للمتابعة", en: "Select your role to continue" },
  mockNotice: {
    ar: "نسخة تجريبية — لا توجد مصادقة حقيقية",
    en: "Demo build — there is no real authentication",
  },
} as const satisfies LabelMap;

/** Labels used by shared components (DataTable, attachments, module screens grid…). */
export const componentLabels = {
  pageOf: { ar: "صفحة {page} من {total}", en: "Page {page} of {total}" },
  moduleScreens: { ar: "شاشات الموديول", en: "Module screens" },
  errorTitle: { ar: "تعذّر تحميل البيانات", en: "Could not load data" },
  attachments: { ar: "المرفقات", en: "Attachments" },
  addAttachments: { ar: "إضافة مرفقات", en: "Add attachments" },
  dropOrBrowse: {
    ar: "اسحب الملفات هنا أو اضغط للاستعراض",
    en: "Drag files here or click to browse",
  },
  noAttachments: { ar: "لا توجد مرفقات", en: "No attachments" },
  removeAttachment: { ar: "حذف المرفق", en: "Remove attachment" },
  downloadAttachment: { ar: "تنزيل (وهمي)", en: "Download (mock)" },
  uploading: { ar: "جارٍ الرفع...", en: "Uploading..." },
  uploaded: { ar: "تم الرفع", en: "Uploaded" },
  selectPlaceholder: { ar: "اختر...", en: "Select..." },
  selectEmployee: { ar: "اختر موظفاً", en: "Select employee" },
  noPermission: { ar: "لا تملك صلاحية هذا الإجراء", en: "You do not have permission for this action" },
  confirmAction: { ar: "تأكيد الإجراء", en: "Confirm action" },
  remove: { ar: "إزالة", en: "Remove" },
  add: { ar: "إضافة", en: "Add" },
} as const satisfies LabelMap;

export const commonLabels = {
  login: { ar: "تسجيل الدخول", en: "Login" },
  logout: { ar: "تسجيل الخروج", en: "Log out" },
  search: { ar: "بحث", en: "Search" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  switchRole: { ar: "تبديل الدور", en: "Switch Role" },
  switchTheme: { ar: "تبديل المظهر", en: "Toggle theme" },
  create: { ar: "إنشاء", en: "Create" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  filter: { ar: "فلترة", en: "Filter" },
  list: { ar: "لائحة", en: "List" },
  details: { ar: "تفاصيل", en: "Details" },
  createEdit: { ar: "إنشاء/تعديل", en: "Create/Edit" },
  activityLog: { ar: "سجل حركات", en: "Activity Log" },
  kpis: { ar: "مؤشرات", en: "KPIs" },
  previous: { ar: "السابق", en: "Previous" },
  next: { ar: "التالي", en: "Next" },
  noResults: { ar: "لا توجد نتائج", en: "No results" },
  loading: { ar: "جارٍ التحميل...", en: "Loading..." },
  loadError: { ar: "حدث خطأ أثناء تحميل البيانات", en: "Failed to load data" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  all: { ar: "الكل", en: "All" },
  yes: { ar: "نعم", en: "Yes" },
  no: { ar: "لا", en: "No" },
  back: { ar: "رجوع", en: "Back" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  close: { ar: "إغلاق", en: "Close" },
  comingSoon: { ar: "قريباً", en: "Coming soon" },
  comingSoonDescription: {
    ar: "هذه الشاشة قيد التطوير وستكون متاحة قريباً",
    en: "This screen is under development and will be available soon",
  },
  currencySymbol: { ar: "د.ع", en: "IQD" },
  vsPreviousPeriod: { ar: "عن الفترة السابقة", en: "vs previous period" },
  addAttachment: { ar: "إضافة مرفق", en: "Add Attachment" },
  noFileSelected: { ar: "لم يُرفع ملف بعد", en: "No file uploaded yet" },
} as const satisfies LabelMap;
