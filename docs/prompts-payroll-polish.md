# برومتات المرحلة 7 — التلميع والربط الشامل

> المرجع: playbook القسم (المرحلة ج) + `docs/roadmap.md`. كل برومت = commit + سطر WORKLOG.

### 7.1 الصفحة الرئيسية للموديول + Dashboard
```
اقرأ WORKLOG.md. ابنِ /payroll (ModuleScreensGrid بكل الشاشات + KPIs عبر الموديولات 1–6) و /dashboard (لوحة الإدارة العليا: كلفة الرواتب، الصافي، الالتزامات المستحقة للتوريد، السلف القائمة، العقوبات، دورات معلّقة) — مع KPICard بأسهم اتجاه.
commit: "feat(dashboard): payroll module home and executive dashboard".
```

### 7.2 خدمة الموظف الذاتية
```
ابنِ /payroll/my-payslips (قائمة قسائمي بعد Posted + عرض/طباعة) و/payroll/my-loans (سلفي + طلب جديد) لدور employee فقط.
commit: "feat(payroll): employee self-service screens".
```

### 7.3 بحث عابر + إشعارات موحّدة
```
فعّل البحث العام بالـ Topbar (موظفون، دورات، قروض، عقوبات، بنود) والإشعارات (دورة بانتظار الاعتماد، قرض بانتظار الاعتماد، سقف استقطاع مُتجاوز، فترة قريبة الإغلاق) عبر API، مع شارة العدّاد.
commit: "feat(shell): cross-module search and notifications".
```

### 7.4 المراجعة الواقعية النهائية
```
راجع كل الشاشات بالوضعين واللغتين والأدوار الخمسة: بيانات منطقية ومترابطة، لا فراغات، لا أخطاء console/network، أرقام الأمثلة الذهبية سليمة، الترحيل والعكس ينعكسان على القروض والعقوبات والمدخلات. صفر أخطاء ببناء npm run build. أعطِ المستخدم قائمة نهائية للتجربة. سجّل بـ WORKLOG أي انحراف عن الـ specs.
commit: "chore: final realism review".
```
