# برومتات الموديول 4 — العقوبات والغياب/التأخير

> المرجع: `docs/spec-payroll-penalties.md`. كل برومت = commit + سطر WORKLOG. عند 4.10 قف للموافقة.

### 4.1 راوتات فارغة
```
اقرأ WORKLOG.md، ثم القسمين 8 و9 بـ docs/spec-payroll-penalties.md.
ابنِ /payroll/penalties و/[id] و/new و/attendance-simulator و/register (فارغة) مع Sidebar.
commit: "feat(penalties): scaffold empty routes".
```

### 4.2 Mock data + API + دوال الحضور
```
اقرأ القسم 2 و4 (P-1..P-9). أنشئ mock-data/payroll/{penalties,penalty-installments,penalty-activity-log}.json و mock-data/hr/attendance-summary.json (لكل موظف×فترة: غياب، مرات/دقائق التأخير، LWP، إضافي) مع حالة مثال 12.4 (غياب 2، تأخير 3، عقوبة 5 أيام) وعقوبة «راتب شهر» مقسّمة 5 أشهر وعقوبات بحالات متنوعة. اكتب lib/payroll/attendance.ts (خصم الغياب والتأخير حسب سياسة الملف) و lib/payroll/netProtection.ts (السقف والتقسيط/AutoSpread). Route Handlers.
commit: "feat(penalties): add mock data, API routes and attendance/net-protection helpers".
```

### 4.3 اللائحة
```
ابنِ /payroll/penalties: تبويبات الحالة + فلاتر (النوع، الموظف، القسم) + DataTable + KPICards.
commit: "feat(penalties): penalties list screen".
```

### 4.4 التفاصيل
```
ابنِ /payroll/penalties/[id]: رأس القرار (رقم/تاريخ/سبب/المُصدِر) + جدول الأقساط + الموظف + Timeline + Audit + تعليقات.
commit: "feat(penalties): penalty detail screen".
```

### 4.5 State machine + قواعد
```
اقرأ القسمين 3 و4. طبّق Draft→Approved→Applying→Applied/Cancelled وقواعد P-1..P-6 و P-10..P-12، وأزرار حسب الحالة والدور مع Audit.
commit: "feat(penalties): status state machine and business rules".
```

### 4.6 الفورم + المعاينة الحيّة
```
ابنِ فورم الإنشاء/التعديل (نوع/قيمة/سبب/رقم وتاريخ القرار/تقسيط) مع معاينة الأقساط والسقف الحيّة (P-13) و تقسيط OneMonthSalary تلقائياً (P-4).
commit: "feat(penalties): create form with live spread preview".
```

### 4.7 محاكي الحضور + سجلّ العقوبات
```
ابنِ /payroll/penalties/attendance-simulator (موظف+فترة → خصم الغياب والتأخير خطوة بخطوة بنفس دوال المحرك) و/payroll/penalties/register (سجلّ العقوبات القانوني بجدول قابل للطباعة).
commit: "feat(penalties): attendance simulator and penalties register".
```

### 4.8 الصلاحيات
```
أضف صفوف payroll.penalty لـ /payroll/permissions وطبّق القسم 5.
commit: "feat(penalties): module permissions".
```

### 4.9 KPIs
```
اربط KPIs القسم 6.
commit: "feat(penalties): wire KPI dashboard".
```

### 4.10 اختبار تدفق كامل
```
نفّذ بالمتصفح: عقوبة «راتب شهر» ← تقسيط تلقائي 5×180,000 ← اعتماد ← محاكي الحضور بحالة 12.4 ← تبديل ثيم/لغة/دور. أعطِ المستخدم خطوات وقف للموافقة.
```
