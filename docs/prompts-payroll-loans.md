# برومتات الموديول 3 — السلف والقروض

> المرجع: `docs/spec-payroll-loans.md`. **تذكير**: لا إشارة لـ `EmployeeReceivable` ولا `Finance.AdvanceRequest` بأي شاشة. كل برومت = commit + سطر WORKLOG. عند 3.10 قف للموافقة.

### 3.1 راوتات فارغة
```
اقرأ WORKLOG.md، ثم القسمين 8 و9 بـ docs/spec-payroll-loans.md.
ابنِ /payroll/loans و/[id] و/new و/payroll/my-loans (فارغة) مع Sidebar.
commit: "feat(loans): scaffold empty routes".
```

### 3.2 Mock data + API
```
اقرأ القسم 2. أنشئ mock-data/payroll/{loans,loan-installments,loan-activity-log}.json: قرض إسكان 100,000/قسط (مثال 12.1)، قرض 150,000/قسط (مثال 12.2)، سلف راتب، قرض مسدد، ملغى، بانتظار الاعتماد، معتمد جاهز للصرف، قرض مؤجّل قسط. مترابطة مع الموظفين والفترات. اكتب lib/payroll/loans.ts (مولّد الجدول: L-2/L-3 مع امتصاص التقريب بالقسط الأخير). Route Handlers: قائمة/تفصيل/إنشاء/انتقالات الحالة.
commit: "feat(loans): add mock data and API routes".
```

### 3.3 اللائحة
```
اقرأ القسم 8 (شاشة 1).
ابنِ /payroll/loans: تبويبات الحالة + فلاتر (النوع، الموظف، الفترة) + بحث + DataTable + StatusBadge + KPICards.
commit: "feat(loans): loans list screen".
```

### 3.4 التفاصيل
```
اقرأ القسم 8 (شاشتا 2 و7).
ابنِ /payroll/loans/[id]: رأس + بطاقة الرصيد + جدول الأقساط (حالة كل قسط + رابط القسيمة) + Timeline + Audit + تعليقات + روابط الموظف/القيد.
commit: "feat(loans): loan detail screen".
```

### 3.5 State machine + قواعد
```
اقرأ القسمين 3 و4 (L-1..L-13).
طبّق الانتقالات (submit/approve/reject/disburse/cancel/early-settle/defer/waive) بـ WorkflowActionBar حسب الحالة والدور، وكل إجراء يضيف سطر Audit. توليد الجدول عند الاعتماد. G6: Active بعد أول استقطاع.
commit: "feat(loans): status state machine and business rules".
```

### 3.6 فورم الطلب + مودالات
```
اقرأ القسم 8 (شاشات 3 و5 و6).
ابنِ فورم الطلب مع معاينة جدول الأقساط الحيّة وتحذير سقف الاستقطاع (L-13)، ومودال الصرف بـ JournalPreview (مدين قروض/دائن نقد، JV-EMPLOAN-####)، ومودال التسوية المبكرة (نقد/راتب).
commit: "feat(loans): create form and disburse/early-settle modals".
```

### 3.7 تأجيل/إعفاء قسط
```
طبّق إجراءات القسط Deferred/Waived (القسم 3 — Active) مع Audit، ومنع سلفتين متزامنتين (L-12).
commit: "feat(loans): installment defer and waive actions".
```

### 3.8 الصلاحيات
```
أضف صفوف payroll.loan لـ /payroll/permissions وطبّق القسم 5 (deptHead يطلب لقسمه، financeAccountant يصرف فقط).
commit: "feat(loans): module permissions".
```

### 3.9 KPIs
```
اربط KPIs القسم 6 من mock-data.
commit: "feat(loans): wire KPI dashboard".
```

### 3.10 اختبار تدفق كامل
```
نفّذ بالمتصفح: طلب قرض ← إرسال ← اعتماد (يظهر الجدول) ← صرف (معاينة القيد + journalRef) ← تسوية مبكرة على قرض آخر ← تبديل ثيم/لغة/دور. أعطِ المستخدم قائمة خطوات وقف للموافقة. (واجهة my-loans تُبنى بالمرحلة 7.)
```
