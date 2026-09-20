# Spec — الموديول 1: مرجعيات الرواتب (Payroll Configuration)

> **المصدر**: الدراسة الأقسام 4.2–4.4، 5.2–5.5، 6، 8.2 (كيانات 1–4، 6–8)، 9.7، 11 (قرارات 5،6،10،14،15،16،17). كل رقم توضيحي كما وردت الدراسة.
> ما هو مو بالمصدر يُوسَم **«قرار موك أب»**.

---

## 1. النطاق وصلته بالموديولات

**يغطي**: تعريف بنود الراتب، الملفّين (حكومي/خاص) مع سياسة الحضور، هياكل الرواتب، السلّم الوظيفي الحكومي، وجداول الضريبة/التقاعد/الضمان **المؤرّخة**. هذا هو "الأساس" اللي كل بقية الموديولات تقرأ منه — لا فروع `if (government)` بالكود، الفرق كله بصفوف هذي الجداول (الدراسة 0).

| يغذّي | كيف |
|---|---|
| الموديول 2 (التعويض) | يختار الملف + هيكل الراتب + درجة/مرحلة السلّم |
| الموديول 5 (المحرك) | كل الحساب يقرأ المكوّنات والنسب والشرائح النافذة بتاريخ الفترة |
| الموديول 4 (العقوبات) | `AttendancePenaltyPolicy` وسقف الاستقطاع الشهري |

## 2. نموذج البيانات

### 2.1 `PayrollComponent` — بند راتب (mock-data: `payroll/components.json`)
| الحقل | النوع | ملاحظات |
|---|---|---|
| `id`, `code` (فريد) | string | مثل `BASIC`, `HOUSING`, `INCOME_TAX` |
| `name` {ar,en} | | |
| `componentType` | enum | `Earning` \| `Deduction` \| `EmployerContribution` \| `Informational` |
| `category` | enum | Basic, Allowance, Overtime, Bonus, StatutoryPension, StatutorySocialSecurity, IncomeTax, LoanRepayment, UnionDues, AbsenceDeduction, LatenessDeduction, DisciplinaryPenalty, CourtOrder, Other |
| `calculationMethod` | enum | FixedAmount \| PercentOfBase \| Formula \| RateTable \| AttendanceDriven \| Manual |
| `percentValue?`, `baseComponentCodes[]` | | وعاء النسبة |
| `isTaxable`, `isPensionable`, `isSocialSecurityBase`, `isProratable` | bool | أعلام الأوعية |
| `reducesGross` | bool | خصم الغياب/التأخير = true؛ العقوبة = false |
| `expenseAccountCode?`, `payableAccountCode?` | string | حسابات GL (Placeholder ربط Finance) |
| `sequence`, `isActive` | | |

**Seed (الدراسة 4.3، 4.4، 5.2)**: حكومي — الاسمي، العلاوة السنوية، مخصصات (شهادة، منصب، زوجية، أطفال، خطورة، مهنة، نقل، موقع)، إضافي. خاص — الأساسي، بدل سكن، نقل، طعام، هاتف، طبيعة عمل، خطورة، إضافي، مكافأة. استقطاعات — تقاعد (موظف)، ضمان (موظف)، ضريبة دخل، قسط قرض، نقابة، خصم غياب، خصم تأخير، عقوبة تأديبية، اقتطاع قضائي، أخرى. مساهمات صاحب العمل — تقاعد، ضمان.

### 2.2 `PayrollProfile` — ملف النظام (`payroll/profiles.json`)
| الحقل | ملاحظات |
|---|---|
| `code` (`GOVERNMENT_IQ` \| `PRIVATE_IQ`), `name` {ar,en} | |
| `enablePension`, `enableSocialSecurity`, `enableIncomeTax` | حكومي: تقاعد+ضريبة؛ خاص: ضمان+ضريبة |
| `payFrequency` | Monthly (المدعوم فعلياً)؛ Weekly/Daily تظهر بالقائمة وتُعطَّل (الدراسة 1) |
| `roundingRule` | `1 \| 250 \| 500 \| 1000` — الافتراض 250 (قرار #10) |
| `currencyCode` | `IQD` |
| `cutoffDay` | يوم القطع |
| `overtimeMultiplierNormal/Rest/Holiday` | خاص ≥ 1.5 (5.3)؛ الراحة/العطلة نسب أعلى تُثبَّت لاحقاً — **قرار موك أب**: 1.5 / 2.0 / 2.0 |
| `dayRateBasis` | `WorkingDays` (افتراضي، قرار #14) \| `CalendarDays` |
| **`attendancePenaltyPolicy`** (owned) | `graceMinutes` (10)، `latenessMethod` (PerMinute/Tiers/CountBased — الافتراضي Tiers)، `latenessTiers[]` (مثال الدراسة: 1–15د = ربع يوم، 16–30 = نصف يوم)، `latenessRatePerMinute?`, `maxLateEventsBeforeDayCut?`, `absenceDayRateComponentCodes[]`, `maxMonthlyDeductionPercent` (25)، `overBreachAction` (AutoSpread افتراضي \| Block) |

### 2.3 `SalaryStructure` + `SalaryStructureLine`
`code, name, profileId, effectiveFrom/To` — السطر: `componentId, overrideMethod?, overrideAmount?, overridePercent?, overrideExpenseAccountCode?, overridePayableAccountCode?, sequence`. هيكل لكل ملف (مثلاً «هيكل حكومي قياسي»، «هيكل خاص — إدارة»، «هيكل خاص — عمال»).

### 2.4 `GovtGradeScale` + `GovtGradeStep`
Scale: `code, name, profileId (GOVERNMENT_IQ), effectiveFrom`. Step: `grade (1–10), step (1–N), nominalSalary, annualIncrementAmount`. **Seed**: جدول كامل 10 درجات × مراحل (قرار #6) — أرقام توضيحية بحيث درجة 7/مرحلة 3 = 620,000 (مثال 12.1).

### 2.5 `TaxConfiguration` + `TaxBracket` + `TaxExemption`
`profileId, effectiveFrom, calcBasis (MonthlyDirect افتراضي | Annualized), currencyCode`. Exemption: `kind` (Personal/Married/Spouse/PerChild/AgeOver63/Disability), `annualAmount`. Bracket: `fromAmount, toAmount?, rate`. (الفجوات G1/G2 بالـ roadmap: الشرائح **توضيحية** قابلة للتعديل).

### 2.6 `PensionConfiguration` (حكومي)
`profileId, effectiveFrom, employeeRate (10%), employerRate (15%), baseComponentCodes[], employeePayableAccountCode, employerExpenseAccountCode, employerPayableAccountCode`.

### 2.7 `SocialSecurityConfiguration` (خاص)
مثل التقاعد + `establishmentFileNo, remittanceCycle, activityRateOverrides[]` — 5% موظف / 12% صاحب عمل (G7).

## 3. دورة حياة الحالات
الكيانات مرجعية بدون State Machine حقيقي. المتاح:
- `isActive` (نشط/معطّل) لكل مكوّن/ملف/هيكل.
- **التأريخ (Effective dating)** للضريبة/التقاعد/الضمان/الهيكل/السلّم: كل تعديل جوهري = سجل جديد بـ `effectiveFrom`، والسابق يُغلق تلقائياً (`effectiveTo = effectiveFrom − يوم`). الحالة المشتقة: `Upcoming | Current | Expired`.

## 4. قواعد العمل (Validation)
| # | القاعدة | المصدر |
|---|---|---|
| C-1 | `code` فريد لكل بند/ملف/هيكل | عام |
| C-2 | `PercentOfBase` تتطلب `percentValue` و`baseComponentCodes` غير فارغة | 8.2 |
| C-3 | `reducesGross = true` فقط لـ AbsenceDeduction/LatenessDeduction؛ العقوبة/القرض/القضائي = false | 3.4 |
| C-4 | ملف `PRIVATE_IQ`: مضاعف الإضافي العادي ≥ 1.5 | 5.3 |
| C-5 | ملف لا يمكن تفعيل تقاعد وضمان معاً لنفس الموظف (يُحدَّد بالتعويض) — التنبيه هنا فقط | 4.5 |
| C-6 | `roundingRule ∈ {1,250,500,1000}` | قرار #10 |
| C-7 | `maxMonthlyDeductionPercent` بين 1 و100، الافتراضي 25 | قرار #16 |
| C-8 | `graceMinutes ≥ 0`؛ شرائح التأخير غير متداخلة ومتصلة | قرار #15 + مشتق |
| C-9 | إعداد جديد (ضريبة/تقاعد/ضمان) يجب `effectiveFrom` أحدث من آخر سجل للملف، والسابق يُغلق تلقائياً | 7.3 (Rule Parameters مؤرّخة) |
| C-10 | شرائح الضريبة: أول شريحة تبدأ من 0، بلا فجوات/تداخل، آخر شريحة `toAmount = null` | مشتق |
| C-11 | السلّم: لكل (درجة، مرحلة) خلية واحدة، والاسمي متصاعد بالمرحلة | 4.2 |
| C-12 | لا حذف لبند/هيكل مستخدم — فقط تعطيل (**قرار موك أب**) | — |
| C-13 | الملفات اليومي/الأسبوعي تظهر معطّلة برسالة «قيد التطوير» | 1 |

## 5. الصلاحيات (الموك أب)
CASL subjects: `payroll.component`, `payroll.structure`, `payroll.config` (ملفات/ضريبة/تقاعد/ضمان/سلّم). أفعال `view/create/update/delete`.

| الدور | view | create/update | delete |
|---|---|---|---|
| hrManager | ✅ | ✅ | ✅ |
| payrollOfficer | ✅ | ✅ | ❌ |
| financeAccountant | ✅ | ❌ (فقط حسابات GL بالبنود) | ❌ |
| deptHead / employee | ❌ | ❌ | ❌ |

## 6. مؤشرات (KPIs) — بطاقات صفحة المرجعيات
عدد المكوّنات النشطة · عدد الهياكل · الملف الأكثر استخداماً (عدد الموظفين لكل ملف) · تاريخ آخر تحديث لجداول الضريبة/التقاعد/الضمان · تنبيه «إعداد ينتهي قريباً».

## 7. التكاملات (Placeholders)
- **Finance/GL**: حقول `expenseAccountCode/payableAccountCode` تُختار من قائمة حسابات وهمية (`payroll/gl-accounts.json`) — بدون تكامل حقيقي.
- **ما يُخصَّص للجريدة الرسمية**: شارة تحذير على شاشات النسب: «الأرقام توضيحية — تُثبَّت من المصادر الرسمية» (الدراسة 4/5).

## 8. قائمة الشاشات الكاملة
| # | الشاشة | المسار | ملاحظات |
|---|---|---|---|
| 1 | صفحة الموديول (ModuleScreensGrid + KPIs) | `/payroll` | تشمل كل الأقسام (تكتمل تدريجياً) |
| 2 | بنود الراتب — لائحة | `/payroll/config/components` | فلاتر: النوع، الفئة، طريقة الاحتساب، نشط؛ بحث بالكود/الاسم |
| 3 | بند — تفاصيل/إنشاء/تعديل | `.../components/[id]`, `/new` | فورم بأعلام الأوعية، اختيار الحسابات |
| 4 | الملفات (Profiles) — لائحة + تفاصيل بتبويبات | `/payroll/config/profiles`, `/[id]` | تبويب عام · تبويب **سياسة الحضور** (شرائح التأخير قابلة للتحرير بـ ChipListEditor/جدول) · تبويب الأنظمة المفعّلة |
| 5 | هياكل الرواتب — لائحة + محرر السطور | `/payroll/config/structures` | ترتيب السطور، override لكل بند |
| 6 | السلّم الوظيفي الحكومي | `/payroll/config/grade-scales` | شبكة درجة×مرحلة قابلة للتحرير + العلاوة السنوية |
| 7 | إعدادات الضريبة | `/payroll/config/tax` | سجل تاريخي (Timeline) + جدول شرائح + جدول إعفاءات + **حاسبة تجريبية** (أدخل وعاء → ضريبة) |
| 8 | إعدادات التقاعد | `/payroll/config/pension` | سجل مؤرّخ + فورم |
| 9 | إعدادات الضمان الاجتماعي | `/payroll/config/social-security` | سجل مؤرّخ + `activityRateOverrides` |
| 10 | سجل حركات المرجعيات (Audit Trail) | تبويب بكل تفاصيل | من `payroll/config-activity-log.json` |
| 11 | صلاحيات الموديول | `/payroll/permissions` | مصفوفة دور × subject × فعل (toggle شكلي) — تُنشأ هنا وتُوسَّع لاحقاً |

## 9. ترتيب الأوامر (للبناء)
1. راوتات فارغة + روابط Sidebar.
2. mock-data (`components`, `profiles`, `structures`, `gradeScales`, `taxConfigs`, `pensionConfigs`, `socialSecurityConfigs`, `gl-accounts`) + API.
3. لائحة البنود (شاشة 2) + `FilterSelect`.
4. تفاصيل البند + Audit (شاشات 3،10).
5. فورم إنشاء/تعديل + تحقق C-1..C-3.
6. الملفات + سياسة الحضور (شاشة 4).
7. هياكل الرواتب (5).
8. السلّم الوظيفي (6).
9. الضريبة/التقاعد/الضمان + التأريخ + الحاسبة (7،8،9).
10. شاشة الصلاحيات (11) + KPIs + اختبار تدفق كامل.
