# برومتات المرحلة 0 — الأساس المشترك (ENKI ERP Payroll Mock)

> نفّذها بالترتيب. **كل خطوة = commit + سطر WORKLOG.** بعد 0.9 قف واطلب تحقق المستخدم بالمتصفح.
> المراجع: `docs/playbook-new-mock.md` · `docs/identity.md` · `docs/roadmap.md`. الأساس البصري والمكوّنات يُستنسخ من `C:\repos\Enki-Workspace-Mock`.

---

### 0.1 تهيئة المشروع
```
اقرأ docs/playbook-new-mock.md (القسمين 2–5) و docs/roadmap.md (القسمين 2 و5).

هيّئ المشروع بجذر C:\repos\Payroll_mock: Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui (نفس components.json و style=base-nova بـ C:\repos\Enki-Workspace-Mock)، مع next-themes و lucide-react. أنشئ هيكل المجلدات بالرود ماب (القسم 5) مع app/(shell)/payroll/ داخل (shell). اكتب CLAUDE.md بالقواعد السبع الإلزامية بالقسم 4 من الـ playbook (مع تعديل الأسماء لموديول الرواتب) ومرجع docs/roadmap.md و spec-payroll-*.md. أضف سكربت dev ينظّف .next.

لسا بدون تصميم أو شعارات.
اعمل commit بعنوان "chore: scaffold Next.js project and structure"، وأضف سطر بـ WORKLOG.md (يُنشأ بالخطوة الجاية).
```

### 0.2 WORKLOG
```
أنشئ WORKLOG.md بالقاعدة الثابتة بالأعلى (اقرأه من البداية قبل أي عمل، Append-only) وصيغة السجل بالقسم 9 من الـ playbook، وأول سجل للخطوتين 0.1 و0.2.
commit: "docs: add WORKLOG".
```

### 0.3 Design Tokens
```
اقرأ docs/identity.md (القسم 1).

انسخ من C:\repos\Enki-Workspace-Mock حرفياً: app/globals.css (ألوان الهوية + سلّم الوضع الغامق + @utility bg-brand-gradient و bg-shell-wash)، و public/brand/* و app/icon.png. أضف tokens دلالية لألوان الموديولات (icon tiles) المستخدمة بلوحة الموديولات (برتقالي، أخضر نعناعي، أصفر، سماوي، رمادي، وردي، بنفسجي…) كمتغيرات CSS بالوضعين.

بدون Sidebar بعد.
commit: "feat(shell): design tokens and brand assets" + WORKLOG.
```

### 0.4 Dark/Light
```
فعّل next-themes (attribute=class, defaultTheme=light, enableSystem=false, suppressHydrationWarning على html) وتأكد من التناسق الغامق كما بـ globals.css. لا زر بعد.
commit: "feat(shell): theme provider" + WORKLOG.
```

### 0.5 لغتان
```
أنشئ LocaleProvider (ar/en، dir و lang على html) و lib/i18n/labels.ts (اسم الموديول، عناصر عامة: بحث/حفظ/إلغاء/تحميل/خطأ/الكل…، الأدوار الخمسة بالرود ماب القسم 4) وخطوط Cairo (عربي) و Geist (إنكليزي) بنفس أسلوب Enki-Workspace-Mock (--font-sans يتبدّل بحسب [dir]). <html> الافتراضي lang="ar" dir="rtl".
commit: "feat(shell): locale provider and base labels" + WORKLOG.
```

### 0.6 الـ Shell (حسب لقطة ENKI ERP)
```
اقرأ docs/identity.md كاملاً وشاهد docs/assets/enki-erp-home.png.

ابنِ:
- Sidebar ملتصق بالحافة (يمين بالعربي/يسار بالإنكليزي) ينطوي: شعار ENKI ERP + قائمة الموديولات (كل الموديولات بالقسم 2.1 من identity.md؛ الرواتب فقط حيّة وله أقسام فرعية بسهم Chevron، والباقي يفتح ComingSoon) + أسفل القائمة: الإعدادات/اللغة/الإشعارات.
- Topbar: اسم الشركة الوهمي، زر +، بحث عام (اختصار K⌘)، شريط Quick Access أفقي قابل للتمرير، مفتاح الثيم، اسم المستخدم + الأفاتار + مبدّل الدور (placeholder حتى 0.7).
- Breadcrumbs، و ComingSoon.
- الصفحة الرئيسية / (لوحة الموديولات): العنوان «مرحباً بك في نظام إنكي»، شبكة بطاقات بأيقونة داخل مربع ملوّن + شارة Ctrl+X + hover بلون الموديول، وبطاقة الرواتب المميزة.
- Layout (shell) بـ app/(shell)/layout.tsx.

مجلدات الموديولات داخل app/(shell)/ لا جنبه (قسم 3 من الـ playbook).
تحقق بالمتصفح (الوضعين + RTL/LTR) وقارن بصرياً مع اللقطة.
commit: "feat(shell): ENKI ERP shell — sidebar, topbar, module launcher" + WORKLOG.
```

### 0.7 Mock Auth
```
ابنِ /login (بشعار ENKI بداخل بطاقة bg-white ثابتة)، RoleProvider، RoleSwitcher بالأدوار الخمسة (hrManager, payrollOfficer, financeAccountant, deptHead, employee) — بدون route guarding. ألحق المبدّل بالـ Topbar. لا تلف Button المشترك داخل render/asChild لـ Base UI (قسم 5 بالـ playbook).
commit: "feat(auth): mock login and role switcher" + WORKLOG.
```

### 0.8 مكتبة المكوّنات
```
اقرأ playbook (القسم 6 — 0.8) و docs/roadmap.md (القسم 7).

استنسخ وراجع من C:\repos\Enki-Workspace-Mock\components: DataTable, StatusBadge, KPICard, Modal, Timeline, FormField, FilterSelect, SearchableSelect, EmployeeSelect, ChipListEditor, ModuleScreensGrid, مكوّنات المرفقات، + shadcn/ui المطلوبة. وسّعها للـ RTL وخصائص منطقية (ps-/start-). وأضف مكوّنات جديدة خاصة بالرواتب لكن قابلة لإعادة الاستخدام: MoneyCell (فواصل آلاف + "د.ع" + محاذاة رقمية)، MoneyInput، WorkflowActionBar (أزرار حسب الحالة مع صلاحيات الدور)، JournalPreview (جدول قيد مدين/دائن متوازن)، PayslipLineTable.

اعرض كل مكوّن بصفحة داخلية /dev/components (مخفية) للتحقق البصري.
commit: "feat(components): shared component library" + WORKLOG.
```

### 0.9 Mock infra
```
أنشئ lib/mock-api.ts (تأخير 300–600ms + قراءة JSON من mock-data/) و lib/payroll/store.ts (in-memory store يُهيَّأ من JSON عند أول طلب مع دالة reset) و app/api/health/route.ts. انسخ من Enki-Workspace-Mock بيانات الموظفين (employees.json + attendance.json + leaveRequests.json + rewardsDisciplinary.json + positions.json) إلى mock-data/hr/ وطابقها لتخدم الرواتب (قسم 6 من roadmap).
npm run build لازم ينجح.
commit: "feat(infra): mock API layer and HR seed data" + WORKLOG.

ثم قف واطلب من المستخدم التأكد بالمتصفح: تسجيل الدخول، الشعار بالوضعين، قلب الاتجاه، لوحة الموديولات، تبديل الدور.
```
