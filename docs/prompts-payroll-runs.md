# برومتات الموديول 5 — الفترات والمدخلات ودورة الرواتب

> المرجع: `docs/spec-payroll-runs.md` (أكبر موديول — قسّم العمل بالتزام). كل برومت = commit + سطر WORKLOG. عند 5.10 قف للموافقة.

### 5.1 راوتات فارغة
```
اقرأ WORKLOG.md، ثم القسمين 10 و11 بـ docs/spec-payroll-runs.md.
ابنِ /payroll/periods و/inputs و/runs و/runs/[id] و/runs/[id]/payslips/[payslipId] و/payroll/config/golden (فارغة) مع Sidebar.
commit: "feat(runs): scaffold empty routes".
```

### 5.2 Mock data + Store + API
```
اقرأ القسم 2. أنشئ mock-data/payroll/{periods,inputs,runs,payslips,payslip-lines,run-journals,run-activity-log}.json و mock-data/hr/{leave-periods,holidays}.json: 6 فترات ماضية + الحالية Open، دورات بكل الحالات (Draft, Calculated, PendingApproval, Approved, Posted, Paid, Reversed)، قسائم واقعية للموظفين المعرّفين بالموديولات السابقة. وسّع lib/payroll/store.ts. Route Handlers للقراءة فقط بهذي الخطوة.
commit: "feat(runs): add mock data, store and read APIs".
```

### 5.3 لوائح الفترات/المدخلات/الدورات
```
اقرأ القسم 10 (شاشات 1–4).
ابنِ اللوائح الثلاث + فورم إنشاء الفترة وإنشاء المدخل وإنشاء الدورة (النطاق: أقسام/مراكز كلفة/موظفين)، فلاتر وتبويبات وKPICards.
commit: "feat(runs): periods, inputs and runs list screens".
```

### 5.4 تفاصيل الدورة والقسيمة
```
اقرأ القسم 10 (شاشتا 5 و6).
ابنِ /payroll/runs/[id] (Type A: رأس + مجاميع + تبويب القسائم) و/payslips/[payslipId] (شبكة سطور مصنّفة استحقاقات/استقطاعات/مساهمات + الحضور + الأوعية + الصافي) باستخدام PayslipLineTable/MoneyCell. تبويبات المقارنة والتحذيرات والقيد فارغة الآن.
commit: "feat(runs): run and payslip detail screens".
```

### 5.5 المحرك + الاختبارات الذهبية
```
اقرأ القسمين 4 و6 بحرفية، والدراسة 8.3 و12 و G1–G3 بـ roadmap.
ابنِ lib/payroll/engine.ts (دوال نقية calculatePayslip) + regimes/iraq-private.ts و iraq-government.ts (IPayrollRegimeProvider) + tax.ts، مع lib/payroll/__golden__ يتحقق من أمثلة 12.1 و12.2 و12.4 (كل الأرقام عدا الضريبة تطابق حرفياً؛ الضريبة تتحقق من معادلة الشرائح المخزّنة) وصفحة /payroll/config/golden تعرض النتيجة. API POST /runs/[id]/calculate يستخدم المحرك على بيانات الموظفين الفعلية ويولّد قسائم وسطور وwarnings وScheduleItems.
شغّل الاختبارات وأبلغ عن أي فرق.
commit: "feat(runs): calculation engine with golden tests".
```

### 5.6 State machine + قواعد
```
اقرأ القسمين 3 و5 (R-1..R-16).
طبّق انتقالات الدورة (calculate/recalculate/submit/approve/reject) بـ WorkflowActionBar حسب الحالة والدور، وقفل الفترة، وAudit لكل إجراء.
commit: "feat(runs): run state machine and business rules".
```

### 5.7 الترحيل والدفع والعكس
```
اقرأ القسم 3.1 و2.7 والدراسة 8.4 و12.3.
ابنِ الترحيل (معاينة JournalPreview: قيد لكل مركز كلفة متوازن + journalRef JV-PAYRUN-####) والدفع (سند وهمي + تحديث paidStatus) والعكس (قيد عكسي + Reversed + إعادة فتح أقساط القروض/العقوبات/المدخلات + الفترة Locked→Open) — R-6..R-10.
commit: "feat(runs): post, pay and reverse with journal preview".
```

### 5.8 تبويبات الدورة الإضافية
```
ابنِ تبويبات: المقارنة بالدورة السابقة (R-5)، التحذيرات (بما فيها netProtection/AutoSpread)، الاستقطاعات المستحقة (ScheduleItems)، القيد المحاسبي، وشرح الاحتساب (Calculation trace) خطوة بخطوة داخل تفاصيل القسيمة.
commit: "feat(runs): comparison, warnings, deductions and calculation trace tabs".
```

### 5.9 الصلاحيات + KPIs
```
أضف صفوف payroll.run/input/period بـ /payroll/permissions وطبّق القسم 7، واربط KPIs القسم 8 (اتجاه كلفة الرواتب 6 أشهر، توزيع الاستقطاعات، مقارنة بالسابق) بـ Dashboard الموديول.
commit: "feat(runs): module permissions and KPI dashboard".
```

### 5.10 اختبار تدفق كامل
```
نفّذ بالمتصفح: إنشاء دورة على الفترة الحالية ← احتساب (تحقق من أرقام المثالين 12.1/12.2) ← إرسال ← اعتماد ← ترحيل (قيد متوازن) ← دفع ← عكس دورة أخرى (أقساط القروض ترجع Pending) ← تبديل ثيم/لغة/دور. أعطِ المستخدم قائمة خطوات وقف للموافقة.
```
