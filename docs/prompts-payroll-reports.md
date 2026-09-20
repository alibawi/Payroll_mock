# برومتات الموديول 6 — التقارير ونهاية الخدمة والتوريد

> المرجع: `docs/spec-payroll-reports.md`. كل برومت = commit + سطر WORKLOG. عند 6.10 قف للموافقة.

### 6.1 راوتات فارغة
```
اقرأ WORKLOG.md، ثم القسمين 8 و9 بـ docs/spec-payroll-reports.md.
ابنِ /payroll/reports (+ الصفحات الفرعية) و/payroll/remittances و/payroll/end-of-service (+ /[id] و/new) فارغة مع Sidebar.
commit: "feat(reports): scaffold empty routes".
```

### 6.2 Mock data + API
```
أنشئ mock-data/payroll/{end-of-service,remittance-status}.json (طلبات نهاية خدمة بحالات متنوعة لموظفين خاص، حالة توريد لكل فترة). Route Handlers لتجميع التقارير من القسائم: register, bank-transfer, remittances (tax/pension/ss), deferred-deductions, employer-cost.
commit: "feat(reports): add mock data and aggregation APIs".
```

### 6.3 مركز التقارير + كشف الرواتب
```
ابنِ /payroll/reports (ModuleScreensGrid + فلتر الفترة/الملف) و/reports/payroll-register (تجميع بالقسم/مركز الكلفة + مجاميع).
commit: "feat(reports): reports hub and payroll register".
```

### 6.4 قسيمة الراتب + التحويل المصرفي
```
ابنِ قسيمة الراتب المطبوعة A4 (شعار ENKI، Print CSS، T-1) و/reports/bank-transfer (T-3، تصدير CSV وهمي).
commit: "feat(reports): printable payslip and bank transfer file".
```

### 6.5 كشوف التوريد
```
ابنِ /payroll/remittances بتبويبات ضريبة/تقاعد/ضمان، تحقق T-2، حالة التوريد Placeholder، وزر «تصدير بصيغة الجهة» معطّل بتلميح «بانتظار المواصفة».
commit: "feat(reports): statutory remittance statements".
```

### 6.6 نهاية الخدمة
```
اقرأ القسمين 3 و4 (T-4..T-10).
ابنِ لائحة + تفاصيل + فورم /payroll/end-of-service بالحاسبة الحيّة (سنوات الخدمة، آخر أجر، مكافأة، بدل إجازات، تعويض) وحالات Draft→Approved→Paid(+Cancelled) و Audit ومعاينة قيد الدفع. الحكومي: رسالة «مشمول بالتقاعد الموحّد».
commit: "feat(reports): end-of-service calculation".
```

### 6.7 تقارير إضافية
```
ابنِ تقرير الاستقطاعات المؤجّلة (AutoSpread) وتقرير كلفة صاحب العمل.
commit: "feat(reports): deferred deductions and employer cost reports".
```

### 6.8 الصلاحيات
```
أضف صفوف payroll.report و payroll.eos لـ /payroll/permissions وطبّق القسم 5.
commit: "feat(reports): module permissions".
```

### 6.9 KPIs
```
اربط KPIs القسم 6.
commit: "feat(reports): wire KPI dashboard".
```

### 6.10 اختبار تدفق كامل
```
نفّذ بالمتصفح: دورة Paid ← كشف رواتب ← قسيمة مطبوعة ← تحويل مصرفي ← كشوف التوريد ← نهاية خدمة لموظف خاص (اعتماد ثم دفع) ← تبديل ثيم/لغة/دور. أعطِ المستخدم خطوات وقف للموافقة.
```
