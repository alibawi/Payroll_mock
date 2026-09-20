# برومتات الموديول 1 — مرجعيات الرواتب (Config)

> المرجع: `docs/spec-payroll-config.md`. كل برومت = commit + سطر WORKLOG. عند 1.10 قف للموافقة.

### 1.1 راوتات فارغة
```
اقرأ WORKLOG.md أول شي، ثم القسمين 8 و9 بـ docs/spec-payroll-config.md.
ابنِ راوتات فارغة بـ app/(shell)/payroll/ (الصفحة الرئيسية للموديول، config/{components,profiles,structures,grade-scales,tax,pension,social-security}، permissions) مع Breadcrumbs، وأضف روابط الأقسام الفرعية بالـ Sidebar تحت «الرواتب» بالتسميات العربية/الإنكليزية بـ lib/i18n/payroll-labels.ts.
لسا بدون بيانات.
commit: "feat(payroll-config): scaffold empty routes"، وسطر WORKLOG.
```

### 1.2 Mock data + API
```
اقرأ WORKLOG.md، ثم القسم 2 بـ spec-payroll-config.md.
أنشئ mock-data/payroll/{components,profiles,structures,grade-scales,tax-configs,pension-configs,social-security-configs,gl-accounts,config-activity-log}.json بمحتوى واقعي (Seed المكوّنات بالقسم 2.1، ملفّان GOVERNMENT_IQ/PRIVATE_IQ بسياسة الحضور الافتراضية، هيكل حكومي + هيكلين خاص، سلّم 10 درجات × مراحل بحيث درجة 7/مرحلة 3 = 620,000، ضريبة بشرائح وإعفاءات توضيحية، تقاعد 10/15، ضمان 5/12). Route Handlers بـ app/api/payroll/config/** بتأخير وهمي (GET قائمة/تفصيل + POST/PATCH على الـ store). أضف lib/payroll/types.ts.
commit: "feat(payroll-config): add mock data and API routes".
```

### 1.3 لائحة البنود
```
اقرأ WORKLOG.md، القسم 8 (شاشة 2) و4.
ابنِ /payroll/config/components: DataTable بأعمدة (الكود، الاسم، النوع، الفئة، طريقة الاحتساب، أعلام الأوعية كشارات، نشط) + FilterSelect (النوع، الفئة، طريقة الاحتساب، نشط) + بحث + تبويبات (استحقاقات/استقطاعات/مساهمات/معلوماتية) + StatusBadge + loading/error/empty states. KPICard أعلى الصفحة.
لسا بدون تفاصيل أو فورم.
commit: "feat(payroll-config): components list screen".
```

### 1.4 تفاصيل البند + Audit
```
اقرأ القسم 8 (شاشتا 3 و10) بالـ spec.
ابنِ /payroll/config/components/[id]: بيانات كاملة + حسابات GL + الهياكل اللي تستخدمه (روابط) + Timeline/Audit Trail من config-activity-log.
commit: "feat(payroll-config): component detail screen".
```

### 1.5 فورم البند + قواعد
```
اقرأ القسم 4 (C-1..C-3, C-12) والقسم 8 (شاشة 3).
ابنِ فورم إنشاء/تعديل البند (/new و/[id]/edit) بـ FormField/SearchableSelect (اختيار الحسابات، BaseComponentCodes بـ ChipListEditor)، مع validation لقواعد C-1..C-3، وتعطيل بدل الحذف (C-12) مع سطر Audit لكل تغيير.
commit: "feat(payroll-config): component form and validation".
```

### 1.6 الملفات + سياسة الحضور
```
اقرأ القسمين 2.2 و4 (C-4..C-8) و8 (شاشة 4).
ابنِ /payroll/config/profiles (لائحة) و/[id] بتبويبات: عام (الأنظمة المفعّلة، التقريب، مضاعفات الإضافي، أساس معدّل اليوم) · سياسة الحضور (فترة السماح، طريقة التأخير، جدول الشرائح قابل للتحرير، سقف الاستقطاع %، OverBreachAction) · Audit. الملفات اليومي/الأسبوعي معطّلة (C-13). Validation C-4..C-8.
commit: "feat(payroll-config): profiles and attendance penalty policy".
```

### 1.7 هياكل الرواتب
```
اقرأ القسم 2.3 و8 (شاشة 5).
ابنِ /payroll/config/structures: لائحة + محرر السطور (إضافة بند، ترتيب Sequence، override للطريقة/المبلغ/النسبة/الحسابات) وتأريخ EffectiveFrom/To.
commit: "feat(payroll-config): salary structures editor".
```

### 1.8 السلّم الوظيفي
```
اقرأ القسمين 2.4 و4 (C-11) و8 (شاشة 6).
ابنِ /payroll/config/grade-scales: شبكة درجة×مرحلة قابلة للتحرير (اسمي + علاوة سنوية) مع تحقق تصاعد الاسمي، ومؤشر «عدد الموظفين بكل خلية» من التعويضات.
commit: "feat(payroll-config): government grade scale grid".
```

### 1.9 الضريبة/التقاعد/الضمان
```
اقرأ الأقسام 2.5–2.7 و4 (C-9, C-10) و8 (شاشات 7–9) وG1/G2 بـ docs/roadmap.md.
ابنِ الشاشات الثلاث: سجل مؤرّخ (Timeline: Upcoming/Current/Expired) + فورم إعداد جديد بـ effectiveFrom يغلق السابق تلقائياً + جدول شرائح وإعفاءات للضريبة (تحقق C-10) + «حاسبة تجريبية» تدخل وعاء وتطلع الضريبة خطوة بخطوة. شارة تحذير «الأرقام توضيحية».
commit: "feat(payroll-config): tax, pension and social security configuration".
```

### 1.10 الصلاحيات + KPIs + اختبار
```
اقرأ القسمين 5 و6.
ابنِ /payroll/permissions (مصفوفة دور × subject × فعل، toggle شكلي، تبقى قابلة للتوسعة) بصفوف payroll.component/structure/config، و KPIs الصفحة الرئيسية للمرجعيات، وإخفاء الأزرار حسب الدور.
ثم نفّذ اختبار تدفق كامل بالمتصفح: إنشاء بند ← تعديله ← تعطيله ← Audit ← تعديل نسبة ضريبة بتاريخ جديد ← تبديل ثيم/لغة/دور. أعطِ المستخدم قائمة خطوات يجرّبها وقف للموافقة.
commit: "feat(payroll-config): module permissions and KPIs".
```
