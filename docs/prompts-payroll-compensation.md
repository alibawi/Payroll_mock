# برومتات الموديول 2 — تعويض الموظف

> المرجع: `docs/spec-payroll-compensation.md`. كل برومت = commit + سطر WORKLOG. عند 2.10 قف للموافقة.

### 2.1 راوتات فارغة
```
اقرأ WORKLOG.md، ثم القسمين 8 و9 بـ docs/spec-payroll-compensation.md.
ابنِ راوتات فارغة: /payroll/compensations و/[employeeId] و/[employeeId]/new و/import مع روابط Sidebar وتسميات payroll-labels.ts.
commit: "feat(compensation): scaffold empty routes".
```

### 2.2 Mock data + API
```
اقرأ القسم 2. أنشئ mock-data/payroll/{compensations,compensation-components,compensation-activity-log}.json مترابطة مع mock-data/hr/employees.json: ~9 موظفين حكوميين (درجات متنوعة، أحدهم بمثال 12.1)، ~10 خاص (أحدهم بمثال 12.2)، اثنان بسجل تاريخي (علاوة/ترفيع)، واحد بلا تعويض (لتنبيه)، واحد دون الحد الأدنى للأجور. وسّع hr/employees بحقول الدفع/المصرف/الحالة الاجتماعية/الأطفال إن لزم. Route Handlers: قائمة، تفصيل + تاريخ، POST تعيين جديد، GET preview (يستدعي المحرك المبسّط الآن أو stub ثم يُربط بالموديول 5).
commit: "feat(compensation): add mock data and API routes".
```

### 2.3 لائحة التعويضات
```
اقرأ القسم 8 (شاشة 1) و6 (KPIs).
ابنِ /payroll/compensations: DataTable + تبويبات (الكل/حكومي/خاص/بلا تعويض) + FilterSelect (الملف، القسم، طريقة الدفع) + بحث + MoneyCell + KPICards. إخفاء أعمدة المبالغ لدور deptHead.
commit: "feat(compensation): compensation list screen".
```

### 2.4 تفاصيل الموظف
```
اقرأ القسم 8 (شاشتا 2 و6) و2.3.
ابنِ /payroll/compensations/[employeeId]: بطاقة الراتب الحالي + معاينة القسيمة + Timeline سجل تاريخي (Current/Upcoming/Superseded) + التجاوزات + روابط (قروضه، عقوباته، قسائمه) + Audit.
commit: "feat(compensation): employee compensation detail".
```

### 2.5 حالات + قواعد
```
اقرأ القسمين 3 و4 (E-1..E-11).
طبّق الحالات المشتقة وقواعد التحقق، وأغلق السجل السابق تلقائياً عند إضافة جديد، ومنع الحذف لسجل مستخدم بدورة (E-11).
commit: "feat(compensation): effective-dating rules and validation".
```

### 2.6 فورم تعيين راتب + أدوات
```
اقرأ القسم 8 (شاشتا 3 و4).
ابنِ فورم «تعيين راتب جديد اعتباراً من تاريخ» (ديناميكي: حكومي درجة/مرحلة vs خاص أجر أساسي)، تجاوزات بـ ChipListEditor، معاينة راتب حيّة، ومودالات «تطبيق علاوة» و«ترفيع» (E-9، E-10).
commit: "feat(compensation): assign compensation form and increment/promotion tools".
```

### 2.7 استيراد Excel وهمي
```
اقرأ القسم 8 (شاشة 5) و7.
ابنِ /payroll/compensations/import بثلاث خطوات (رفع ملف وهمي → مطابقة الأعمدة → نتيجة نجاح/أخطاء) بدون معالجة حقيقية.
commit: "feat(compensation): mock Excel import wizard".
```

### 2.8 الصلاحيات
```
أضف صفوف payroll.compensation لـ /payroll/permissions وطبّق القسم 5 على الشاشات (deptHead بلا مبالغ، employee يرى نفسه).
commit: "feat(compensation): module permissions".
```

### 2.9 KPIs
```
اربط KPIs القسم 6 من mock-data (تنبيهات: بلا تعويض، دون الحد الأدنى).
commit: "feat(compensation): wire KPI dashboard".
```

### 2.10 اختبار تدفق كامل
```
نفّذ بالمتصفح: تعيين راتب لموظف بلا تعويض ← تعيين آخر بتاريخ لاحق ← ظهور بالسجل التاريخي ← تطبيق علاوة ← تبديل ثيم/لغة/دور. أعطِ المستخدم قائمة خطوات يجرّبها بنفسه وقف للموافقة.
```
