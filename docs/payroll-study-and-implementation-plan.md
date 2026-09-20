# نظام الرواتب (Payroll) في Enki — دراسة شاملة وخطة تنفيذ

> الحالة: 🟡 **مسودّة للمراجعة** — لم يُكتب أي كود بعد. هذا المستند هو مخرج المرحلة 0 (دراسة + خطة).
> الوحدة: **وحدة ABP مستقلة `modules/payroll`** (schema `payroll`، feature flag `Payroll`) تعتمد على `hr` و`core` — لا جزءاً من HR (قسم 8.0). أول تكامل مالي من طرف الموارد البشرية إلى `Finance`.
> الهدف: بناء نظام رواتب واحد قابل للتهيئة يخدم **نظامين**: القطاع الحكومي العراقي والقطاع الخاص العراقي، دون تفريع الكود.
> يُقرأ مع: [[planning-folder-convention]] · [[thin-appservice-cqrs-reference]] · [[feature-contracts-folder-structure]] · [[fiscal-year-period-category]] · [[localize-user-facing-messages]] · [[data-authority-query-convention]]

---

## 0. ملخّص تنفيذي

الرواتب في العراق تختلف بين قطاعين اختلافاً جوهرياً في **مصدر الأجر** و**الاستقطاعات القانونية**:

| المحور | القطاع الحكومي | القطاع الخاص |
|---|---|---|
| مصدر الراتب الأساسي | **السلم الوظيفي** (درجة + مرحلة) + علاوة سنوية + ترفيع | **الأجر التعاقدي** (أساسي + بدلات في العقد) ≥ الحد الأدنى للأجور |
| التأمين الاجتماعي | **التقاعد الموحّد** (لا ضمان اجتماعي للدائم) | **الضمان الاجتماعي للعمال** |
| ضريبة الدخل | قانون 113 لسنة 1982 + تعليمات وزارة المالية | نفس القانون — استقطاع مباشر من صاحب العمل |
| نهاية الخدمة | معاش تقاعدي | مكافأة/حقوق نهاية الخدمة وفق قانون العمل 37/2015 |
| دورة الدفع | شهرية | شهرية على الأقل |

**التوصية المعمارية**: بناء **محرّك مكوّنات راتب مُعرّف بالبيانات (data‑driven payroll component/rule engine)** على غرار `hr_payroll` في Odoo و *wage types + schema* في SAP. النظامان الحكومي والخاص يصبحان **ملفّين (Payroll Profiles)** مختلفين: مجموعة مكوّنات + هيكل راتب + جداول نسب/شرائح مؤرّخة بالتاريخ — لا فروع `if (government)` في الكود.

**التكامل المحاسبي**: عند اعتماد وترحيل دورة الرواتب، تُولَّد قيود عبر الواجهة القائمة
[`IJournalEntryIntegrationAppService.PostAsync(JournalEntryPostDto)`](../../../jasim_api/modules/core/src/Core.Application.Contracts/Integrations/IJournalEntryIntegrationAppService.cs)
— نفس نمط الترحيل الذي تسلكه وثائق Finance الأخرى اليوم (مرجع تصميمي فقط).

**أكبر فجوة حالية**: لا يوجد أي شيء اسمه رواتب في Enki (تأكد بالبحث)، وكيان [`Employee`](../../../jasim_api/modules/hr/src/HR.Domain/Entities/Employees/Employee.cs) يحمل `SalaryType` (شهري/أسبوعي/يومي) و`CurrencyCode` و`BankCardNo` فقط — **بلا أي مبلغ راتب**، وHR **لا يملك أي تكامل مع Finance** حتى الآن.

---

## 1. النطاق والأهداف

### داخل النطاق
- احتساب رواتب دورية (شهرية ابتداءً) لمجموعة موظفين ضمن منظمة/فرع.
- ملفّان جاهزان: `GOVERNMENT_IQ` و`PRIVATE_IQ`، قابلان للتوسعة.
- مكوّنات الأجر (استحقاقات) والاستقطاعات ومساهمات صاحب العمل.
- الاستقطاعات القانونية: ضريبة الدخل، التوقيفات التقاعدية (حكومي)، الضمان الاجتماعي (خاص).
- ربط الحضور/الإجازات: أيام بلا أجر (LWP)، العمل الإضافي، الغياب.
- المدخلات لمرة واحدة: مكافآت، جزاءات، تسويات، بدلات استثنائية.
- **سلف وقروض الموظفين** — كيان جديد `EmployeeLoan` (+ `EmployeeLoanInstallment`) في وحدة `payroll`، **المصدر الوحيد** لكل مبلغ يُسترَدّ من الراتب: `LoanType` (`PersonalLoan` بأقساط | `SalaryAdvance` يُسدَّد من راتب الشهر التالي)، مبلغ أصل + جدول أقساط + رصيد متبقٍّ + دورة موافقة وصرف تُرحّل قيداً. القسط/السلفة المستحقة تُخصم من الصافي كبند استقطاع من الدرجة الأولى، وتُقفَل عند الترحيل.
- استقطاعات يدوية أخرى (جزاءات، نقابة، اقتطاعات قضائية) عبر `PayrollInput`.

> **مستثنى نهائياً من نطاق الرواتب**:
> - **`EmployeeReceivable` (ذمم الموظفين)** — كيان مستقل للعُهد العينية/التلف/السلع.
> - **`Finance.AdvanceRequest` (سلف النشاط الجاري)** — سلف تُصرف لأغراض المشتريات أو أغراض تشغيلية للمؤسسة، وتسويتها شأن مالي بحت لا علاقة له بالراتب.
>
> كلاهما لا يُقرأ منه ولا يُتكامل معه ولا يُشار إليه في هذه الخطة. كل ما يُسترَدّ من راتب الموظف يمرّ عبر `EmployeeLoan` الجديد حصراً.
- **الرواتب الشهرية واليومية والأسبوعية** — `PeriodType` مدعوم في المحرّك (الأجراء اليوميون / العقود حالة عراقية حقيقية)؛ الاختبار المُعمّق أولاً على الشهري.
- **احتساب نهاية الخدمة عند الانفكاك** — بند/تقرير لمرة واحدة (أجر أسبوعين × سنوات الخدمة + بدل الإجازات المتراكمة، وفق قانون العمل 37/2015)، بلا accrual شهري.
- سير عمل: مسودّة ← احتساب ← اعتماد ← ترحيل محاسبي ← دفع، مع عكس الترحيل.
- قسيمة راتب، كشف رواتب، ملف تحويل مصرفي، كشوف التوريد (ضريبة/تقاعد/ضمان).
- تعدّد المستأجرين + Data Authority + توطين عربي/إنجليزي + RTL.

### خارج النطاق (إصدار أول) — مؤجّل بوعي

| البند | لماذا مؤجّل | البديل في v1 |
|---|---|---|
| الاحتساب بأثر رجعي التلقائي (retroactive payroll) | ميزة كبيرة قائمة بذاتها (SAP يفرد لها نظاماً فرعياً: retro triggers, deltas, re-post) | تسوية يدوية عبر `PayrollInput` في الدورة التالية — تغطّي غالبية الحالات |
| مخصّص نهاية الخدمة الشهري التراكمي (accrual) | يحتاج سياسة محاسبية معتمدة ومراجعة مدقّق لقيد الالتزام الشهري | الاحتساب عند الانفكاك موجود في v1 (بند/تقرير) |
| ملفات الجهات الرسمية بصيغتها المعتمدة (تقاعد/ضمان/ضريبة) + الإقرار السنوي | كل جهة لها صيغة ملف/نموذج خاص يجب الحصول عليه | كشوف التوريد بكل الأرقام تُنتَج في المرحلة 4؛ يُضاف التصدير الرسمي فور توفّر المواصفة |
| تعدّد العملات في نفس الدورة | قيمة شبه معدومة للرواتب العراقية (دينار دائماً) وكلفة اختبار عالية | حقول `CurrencyCode` موجودة على الكيانات — إضافة لاحقة بلا هجرة بيانات |

---

## 2. الوضع الحالي في Enki

### ما هو موجود ويُبنى عليه

| المكوّن | الموقع | الاستخدام في الرواتب |
|---|---|---|
| `Employee` (JobTitle, Position, Manager, `SalaryType`, `CurrencyCode`, `BankCardNo`, `EmploymentType`, `MaritalStatus`, `NumOfChildren`) | [`HR.Domain/Entities/Employees`](../../../jasim_api/modules/hr/src/HR.Domain/Entities/Employees/Employee.cs) | صاحب الراتب؛ مصدر الحالة الاجتماعية وعدد الأطفال (مبدئياً). |
| `EmploymentType` enum: `Permanent, Temporary, Contract, PartTime, Internship` | [`Core.Domain.Shared/Entities/SharedEnums.cs`](../../../jasim_api/modules/core/src/Core.Domain.Shared/Entities/SharedEnums.cs) | تمييز الدائم (سلم وظيفي) عن العقد/الأجر اليومي. |
| `Attendance`, `AttendanceSegment`, `ShiftInstance`, `ShiftPattern` | `HR.Domain/Entities/Attendances`, `.../ShiftManagements` | أيام العمل الفعلية، الساعات الإضافية، الغياب. |
| `LeaveType`, `LeaveTransaction`, `LeaveBalance`, `LeaveRequest` | `HR.Domain/Entities/Leave*` | تمييز الإجازة المدفوعة من غير المدفوعة (LWP). `LeaveCategory.Unpaid` موجود. |
| `Holiday`, `HolidayCalendarService` | `HR.Domain/Entities/Holidays` | أيام العطل الرسمية في احتساب أيام العمل والعمل الإضافي. |
| `Finance.AdvanceRequest` + `AdvanceSettlement` — سلف النشاط الجاري | [`Finance.Domain/Entities/Advances`](../../../jasim_api/modules/finance/src/Finance.Domain/Entities/Advances/EmployeeAdvances/AdvanceRequest.cs) | **غير مستخدَم** — نمط دورة الصرف/التسوية فقط كمرجع تصميمي لـ `EmployeeLoan`. |
| `IJournalEntryIntegrationAppService` + `JournalEntryPostDto` (Lines: `AccountCode`, `Debit/DebitSys/Credit/CreditSys`, `CurrencyCode`, `ExchangeRate`, `EmployeeId`, `CostCenterId`, `ProjectId`, `BaseEntry/BaseRef/BaseType`, `FiscalPeriodId`, `IsAutoGenerated`, `IsReversal`) | [`Core.Application.Contracts/Integrations`](../../../jasim_api/modules/core/src/Core.Application.Contracts/Integrations/IJournalEntryIntegrationAppService.cs) | نقطة الترحيل الوحيدة إلى دفتر الأستاذ. |
| `GeneralLedgerAccount` + `GeneralLedgerAccountSeedData`, `CostCenter`, `DocumentType` | `Finance.Domain`, `Core` | حسابات مصروف الرواتب والأمانات + مركز الكلفة + نوع وثيقة `PAYRUN`. |
| `Core.PostingPeriod` (شهر) / `PeriodCategory` (سنة)؛ `JournalEntry.FiscalPeriodId → PostingPeriod` | راجع [[fiscal-year-period-category]] | ربط دورة الرواتب بالفترة المحاسبية. |
| `LeaveEligibilityService`, `HolidayCalendarService` | `HR.Domain/Services` | أمثلة على domain services حسابية داخل HR. |
| نمط التقارير: مجلد لكل تقرير + `.repx` + `ReportDataSeeder` | راجع [[report-per-report-folder-structure]] · [[report-manager-owns-query-logic]] | قسيمة الراتب وكشوف الرواتب. |

### الفجوات (تُعالَج في الخطة)

1. **لا يوجد مبلغ راتب على الموظف** ولا سلّم وظيفي ولا هيكل بدلات → كيان `EmployeeCompensation` جديد (مع سجلّ تاريخي؛ لا نضيف حقل مبلغ على `Employee` مباشرة).
2. **وحدة `payroll` غير موجودة** — تُنشأ كوحدة ABP مستقلة (قسم 8.0) بمشاريع Domain/Contracts/Application/EntityFrameworkCore، `PayrollDbContext` + schema `payroll`، ProjectReference من الـ Host، feature flag `Payroll`.
3. **HR لا يكشف عقود قراءة كافية** — يوجد `Integrations/*IntegrationService` لـ Employee/JobTitle/Position/EmployeeReceivable فقط؛ **الحضور والإجازات وتقويم العطل غير مكشوفة**. تحتاج الرواتب عقوداً في `HR.Application.Contracts` (أو `Core.Application.Contracts`): لقطة موظف، ملخّص حضور/تأخير للفترة، أيام LWP، عطل الفترة.
4. **تكامل مالي من الرواتب** — الرواتب تعتمد `Core.Application.Contracts` (`IJournalEntryIntegrationAppService`)؛ لا يوجد اليوم تكامل مالي من أي وحدة موارد بشرية.
5. **`PostingPeriod` غير مربوط** — يجب ربطه بدورة الرواتب والقيد.
6. **لا يوجد كيان سلف/قروض موظفين** — يُنشأ `EmployeeLoan` (+ `EmployeeLoanInstallment`) في وحدة `payroll` بدورة حياة على غرار `Finance.AdvanceRequest` (موافقة → صرف يُرحّل قيداً → أقساط)، ويغطّي القروض بأقساط وسلف الراتب معاً. **`EmployeeReceivable` و`Finance.AdvanceRequest` خارج النطاق نهائياً** (القرار #3).
7. **لا حسابات رواتب في دليل الحسابات** ولا `DocumentType` للرواتب — تُضاف كـ seed.
8. **لا جداول ضريبة/ضمان/تقاعد** — تُضاف ككيانات تهيئة مؤرّخة + seed قابل للتعديل.

---

## 3. دراسة الرواتب — المفاهيم الأساسية

### 3.1 تشريح قسيمة الراتب

```
الأجر الإجمالي (Gross)      = الأساسي + كل الاستحقاقات/البدلات + العمل الإضافي + المكافآت
  ─ الوعاء التقاعدي/الضماني  = مجموع البنود الخاضعة للتقاعد/الضمان (بحسب علم لكل بند)
  ─ الوعاء الضريبي           = مجموع البنود الخاضعة للضريبة − الإعفاءات (− حصة التقاعد/الضمان إن نصّ القانون)
استقطاعات الموظف            = ض. الدخل + حصة الموظف (تقاعد/ضمان) + أقساط سلف/قروض
                             + خصم الغياب + خصم التأخير + العقوبات التأديبية + نقابة + اقتطاعات قضائية + أخرى
الصافي (Net)               = Gross − استقطاعات الموظف
مساهمات صاحب العمل          = حصة رب العمل (تقاعد/ضمان) + أي بدلات يتحمّلها الكيان ولا تُدفع للموظف
كلفة صاحب العمل (Employer Cost) = Gross + مساهمات صاحب العمل
```

### 3.2 دورة الرواتب (Payroll Cycle)

1. **الفترة (Period)**: شهر محاسبي، له `PostingPeriodId`، وتاريخ قطع (cutoff) وتاريخ دفع (pay date).
2. **الدورة (Run)**: تُنشأ على فترة + ملف (Profile) + نطاق موظفين.
3. **الاحتساب (Calculate)**: تشغيل خط الأنابيب (قسم 8.3) → توليد قسائم رواتب مع سطورها.
4. **المراجعة والاعتماد (Approve)**: مقارنة بالشهر السابق، تسويات، ثم قفل.
5. **الترحيل (Post)**: توليد قيد/قيود محاسبية، ربط `PostingPeriod`، قفل أقساط `EmployeeLoan` المخصومة وتخفيض رصيدها.
6. **الدفع (Pay)**: عبر `PaymentVoucher`/`OutgoingPayment` في Finance (خارج نطاق الرواتب — ربط فقط لتحديث حالة الدفع).
7. **التوريد**: دفع الأمانات (ضريبة/تقاعد/ضمان) لجهات الدولة عبر Finance.
8. **العكس (Reverse)**: قيد عكسي + إرجاع حالة الدورة، عند اكتشاف خطأ بعد الترحيل.

### 3.3 مدخلات الحساب

| المدخل | المصدر في Enki |
|---|---|
| أيام/ساعات العمل الفعلية | `Attendance` / `AttendanceSegment` / `ShiftInstance` |
| أيام بلا أجر (LWP) | `LeaveTransaction` حيث نوع الإجازة غير مدفوع (`LeaveCategory.Unpaid` أو علم على `LeaveType`) |
| **أيام الغياب غير المبرَّر** | فرق الحضور عن الجدول المتوقّع (بعد استبعاد الإجازات/العطل) → خصم = معدّل اليوم × عدد أيام الغياب |
| **دقائق/ساعات التأخير** | فرق وقت الدخول الفعلي عن بداية الوردية (`AttendanceSegment` مقابل `Shift`) بعد فترة السماح → خصم وفق سياسة الملف |
| العمل الإضافي (ساعات) | فرق ساعات الحضور عن الوردية + `Holiday` + سياسة الملف |
| **العقوبات التأديبية** | كيان `DisciplinaryPenalty` (قرار HR: مبلغ مقطوع / عدد أيام راتب / راتب شهر / نسبة) |
| مكافأة/تسوية لمرة واحدة | `PayrollInput` (كيان جديد) |
| أقساط/سلف الموظف | `EmployeeLoan` (قسط الفترة أو السلفة المستحقة) |
| تغيّر الراتب خلال الشهر | `EmployeeCompensation` المؤرّخ (proration) |

### 3.4 الغياب والتأخير والعقوبات التأديبية

استقطاعات مرتبطة بالانضباط الوظيفي، ثلاثة أنواع:

| النوع | المصدر | طريقة الاحتساب | الوعاء الضريبي/التقاعدي |
|---|---|---|---|
| **خصم الغياب** | محسوب من الحضور | `معدّل اليوم × أيام الغياب غير المبرَّر`. معدّل اليوم = (الأساسي [+ بدلات خاضعة] ÷ أيام الشهر أو أيام العمل — حسب سياسة الملف) | يخفّض Gross ⇒ يخفّض الوعاءات تلقائياً |
| **خصم التأخير** | محسوب من الحضور | وفق `AttendancePenaltyPolicy` في الملف: فترة سماح (grace) بالدقائق، ثم إمّا `دقائق التأخير × معدّل الدقيقة`، أو `شرائح` (مثال: 1–15 د = ربع يوم، 16–30 = نصف يوم…)، أو `بعد N مرات تأخير في الشهر = خصم يوم` | يخفّض Gross |
| **العقوبات التأديبية** | كيان `DisciplinaryPenalty` (قرار إداري) | `PenaltyType`: `FixedAmount` (مبلغ مقطوع) \| `DaysOfPay` (عدد أيام × معدّل اليوم) \| `OneMonthSalary` (راتب شهر كامل) \| `PercentOfSalary`. قابلة للتقسيط على عدة أشهر (`SpreadOverMonths`) كي لا يصبح الصافي سالباً | استقطاع مستقل بعد Gross — لا يخفّض الوعاءات |

**حماية الصافي (net protection)** — قاعدة تحقّق في المحرّك:
- إجمالي (العقوبات + الاقتطاعات القضائية + أقساط القروض) في الشهر ≤ **سقف قانوني** كنسبة من الأجر (`AttendancePenaltyPolicy.MaxMonthlyDeductionPercent`، توضيحياً 25٪–50٪ حسب القانون/الجهة).
- عقوبة `OneMonthSalary` تُقسَّط تلقائياً على أقلّ عدد أشهر يحترم السقف (أو تُمنع وتُطلب موافقة تجاوز — القرارات المفتوحة #17 و#18).
- **سجلّ العقوبات**: كل `DisciplinaryPenalty` يحمل `DecisionRef` و`DecisionDate` و`IssuedBy` و`Reason` — يغذّي تقرير «سجلّ العقوبات» المطلوب قانوناً.

> الفرق عن `PayrollInput`: `PayrollInput` مدخل حرّ لمرة واحدة (مكافأة/تسوية)؛ `DisciplinaryPenalty` كيان له سبب وقرار وحالة وتقسيط وسجلّ تدقيق ويظهر في سجلّ العقوبات.

---

## 4. القطاع الحكومي العراقي

> ⚠️ الأرقام والنسب الواردة أدناه **توضيحية للتصميم** ويجب تثبيتها من الجريدة الرسمية وتعليمات وزارة المالية / هيئة التقاعد الوطنية قبل الاعتماد (Phase 0).

### 4.1 الإطار القانوني

- **قانون رواتب موظفي الدولة رقم 22 لسنة 2008** وتعديلاته — السلّم الوظيفي والمخصصات.
- **قانون الخدمة المدنية رقم 24 لسنة 1960** — التعيين، العلاوة، الترفيع، العقوبات.
- **قانون التقاعد الموحّد رقم 9 لسنة 2014** وتعديلاته — التوقيفات التقاعدية والمعاش.
- **قانون ضريبة الدخل رقم 113 لسنة 1982** وتعديلاته + التعليمات التنفيذية السنوية.
- تعليمات مجلس الوزراء بشأن سلالم رواتب فئات خاصة (تدريسيون، أطباء، قضاة، عسكريون، درجات خاصة…).

### 4.2 السلّم الوظيفي (Grade / Step Scale)

- **الراتب الاسمي (Nominal Salary)** = دالة في (الدرجة، المرحلة). عشر درجات وظيفية، لكل درجة عدد من المراحل، ولكل خلية مبلغ اسمي ثابت في جدول السلّم.
- **العلاوة السنوية (Annual Increment / Step‑up)**: انتقال مرحلة واحدة كل سنة خدمة عند تقدير كفاءة مُرضٍ — تضيف مبلغاً ثابتاً للاسمي.
- **الترفيع (Promotion)**: انتقال من درجة إلى الأعلى وفق سنوات الخدمة والشاغر والشهادة.
- في النظام: جدول `GovtGradeScale` + `GovtGradeStep` مؤرّخ؛ الموظف الحكومي يُربط بدرجة/مرحلة، فيُشتق الاسمي، وتُحسب العلاوة كبند مستقل.

### 4.3 المخصصات (Allowances)

| المخصّص | أساس الاحتساب (توضيحي) | خاضع للتقاعد؟ | خاضع للضريبة؟ |
|---|---|---|---|
| مخصصات الشهادة (دكتوراه/ماجستير/بكالوريوس/دبلوم…) | مبلغ ثابت متدرّج حسب المؤهل | نعم (جزئياً حسب القانون) | غالباً معفى جزئياً |
| مخصصات المنصب (مدير عام/مدير/رئيس قسم/م. وحدة) | مبلغ ثابت حسب المستوى الإداري | لا | نعم |
| مخصصات الزوجية | مبلغ ثابت للزوج/الزوجة | لا | **معفى** |
| مخصصات الأطفال | مبلغ ثابت لكل طفل حتى حدّ أقصى | لا | **معفى** |
| مخصصات الخطورة | ٪ من الاسمي (فئات: صحية/هندسية/مخبرية…) | أحياناً | نعم |
| مخصصات المهنة/الاختصاص (طبية، هندسية، قانونية، تعليمية…) | ٪ من الاسمي أو مبلغ ثابت | حسب القانون | نعم |
| مخصصات النقل/المواصلات | مبلغ ثابت | لا | غالباً معفى ضمن حدّ |
| مخصصات الموقع/المنطقة النائية | ٪ من الاسمي | لا | نعم |
| بدل العمل الإضافي/المناوبات | ساعات × معدل | لا | نعم |

> كل صف أعلاه = `PayrollComponent` واحد بأعلامه (`IsPensionable`, `IsTaxable`, `IsProratable`) وطريقة احتسابه.

### 4.4 الاستقطاعات

| الاستقطاع | الوصف (توضيحي — يُثبّت في Phase 0) |
|---|---|
| **التوقيفات التقاعدية** | حصة الموظف ≈ **10٪** من الوعاء التقاعدي (الاسمي + مخصصات محدّدة)؛ حصة الدولة (رب العمل) ≈ **15٪** تُسجّل كمصروف ومساهمة. تُورَّد لهيئة التقاعد. |
| **ضريبة الدخل** | تُحسب على الوعاء الضريبي الشهري بعد **الإعفاءات** (شخصي/زوجية/أطفال/سنّ فوق 63/عجز)، ثم **شرائح تصاعدية** (توضيحياً: 3٪ / 5٪ / 10٪ / 15٪ على شرائح متتالية). المخصصات المعفاة (زوجية/أطفال) خارج الوعاء. |
| **رسوم النقابة** | للمهنيين (مهندسون/أطباء/معلمون/محامون) — ٪ صغيرة أو مبلغ ثابت. |
| **أقساط السلف والقروض** | سلفة راتب، قرض إسكان، صندوق التكافل/التعاضد — قسط شهري ثابت حتى السداد. |
| **خصم الغياب والتأخير** | قطع الراتب عن أيام الغياب غير المبرَّر؛ خصم التأخير وفق تعليمات الجهة (قانون الخدمة المدنية 24/1960 والانضباط). |
| **العقوبات التأديبية** | وفق **قانون انضباط موظفي الدولة رقم 14 لسنة 1991**: لفت نظر، إنذار، **قطع الراتب** (حتى حدّ)، **إنقاص الراتب**، تنزيل الدرجة، الفصل. العقوبات المالية تُنفَّذ كاستقطاع من الراتب بقرار مُوثَّق. |
| **استقطاعات أخرى** | طوابع، حصص صناديق موظفين، اقتطاعات قضائية/نفقة. |

### 4.5 ملاحظات

- الموظف **الدائم** غير خاضع للضمان الاجتماعي للعمال — هو تحت التقاعد الموحّد.
- موظفو **العقود** و**الأجراء اليوميون** قد يخضعون للضمان الاجتماعي بدل التقاعد → يُحدَّد عبر `EmployeeCompensation.ProfileId` لا عبر المستأجر.
- الدفع شهري، غالباً نهاية الشهر أو بداية التالي.

---

## 5. القطاع الخاص العراقي

> ⚠️ نفس التنويه: النسب والحدود توضيحية وتُثبّت من المصادر الرسمية في Phase 0 (خاصة أثر **قانون التقاعد والضمان الاجتماعي للعمال رقم 18 لسنة 2023** الذي حلّ محلّ قانون 1971).

### 5.1 الإطار القانوني

- **قانون العمل رقم 37 لسنة 2015** — عقد العمل، ساعات العمل، الأجر، العمل الإضافي، الإجازات، إنهاء الخدمة.
- **قانون التقاعد والضمان الاجتماعي للعمال** — **رقم 39 لسنة 1971** (المعدّل)، ثم **رقم 18 لسنة 2023** الذي وسّع التغطية وعدّل النسب.
- **الحد الأدنى للأجور** بقرار مجلس الوزراء (توضيحياً: 350,000 دينار/شهر) — الأجر الأساسي لا يقلّ عنه.
- **قانون ضريبة الدخل رقم 113 لسنة 1982** — صاحب العمل مُلزَم بالاستقطاع المباشر والتوريد.

### 5.2 هيكل الأجر

- **الأجر الأساسي** (في العقد) + **بدلات تعاقدية**: سكن، نقل، طعام، هاتف، طبيعة عمل، بدل خطورة.
- ساعات العمل: **8 ساعات/يوم**، **48 ساعة/أسبوع** كحد أقصى قانوني.

### 5.3 العمل الإضافي

- لا يقلّ أجر الساعة الإضافية عن **150٪** من أجر الساعة الاعتيادية.
- نسب أعلى لأيام الراحة الأسبوعية والعطل الرسمية والعمل الليلي (تُثبّت من مواد القانون في Phase 0).

### 5.4 الضمان الاجتماعي

| البند | تحت قانون 39/1971 (توضيحي) | تحت قانون 18/2023 (يُثبّت) |
|---|---|---|
| حصة العامل | ≈ **5٪** من الأجر | تعديل — يُثبّت |
| حصة صاحب العمل | ≈ **12٪** (وقد ترتفع لأنشطة خطرة) | تعديل — يُثبّت |
| الوعاء | الأجر وفق تعريف القانون (أساسي + بدلات خاضعة) | نفس المبدأ |
| التوريد | شهري لدائرة التقاعد والضمان الاجتماعي للعمال، بكشف اشتراكات | نفس المبدأ |

### 5.5 ضريبة الدخل

- نفس آلية القطاع الحكومي: **إعفاءات ثم شرائح**؛ لكن **صاحب العمل** يستقطع من كل قسيمة ويورّد شهرياً/دورياً.
- عادة تُخصم حصة الضمان الاجتماعي من الوعاء الضريبي (يُثبّت).

### 5.6 خصم الغياب والتأخير والجزاءات

- **الغياب غير المبرَّر**: خصم أجر أيام الغياب (وقد يُعدّ إخلالاً يبرّر إجراءً تأديبياً/إنهاءً وفق مواد قانون العمل 37/2015).
- **الجزاءات التأديبية (الغرامات)**: يقيّدها القانون — لا تتجاوز الغرامة الواحدة أجر عدد محدود من الأيام، ومجموع الغرامات الشهرية مسقوف بنسبة من الأجر، وتُسجَّل في **سجلّ جزاءات** لدى صاحب العمل. الحدود الدقيقة تُثبّت في Phase 0.
- **استقطاع راتب شهر**: لا يجوز تنفيذه دفعةً واحدة إذا خالف سقف الاستقطاع الشهري — يُقسَّط.

### 5.7 نهاية الخدمة

- وفق قانون العمل 37/2015: **مكافأة/حقوق نهاية الخدمة** عند إنهاء العقد لغير سبب تأديبي — توضيحياً **أجر أسبوعين عن كل سنة خدمة** كحدّ أدنى إن لم يكن العامل مشمولاً بمعاش، + **بدل الإجازات المتراكمة** + **تعويض الفصل التعسّفي** إن وُجد.
- في الإصدار الأول: احتساب عند الانفكاك فقط (بند/تقرير)، لا accrual شهري.

### 5.8 دورة الدفع

- شهرية على الأقل للأجور الشهرية، بالدينار العراقي، مع كشف أجور موقّع.

---

## 6. جدول المقارنة (ملخّص للمحرّك)

| العنصر | `GOVERNMENT_IQ` | `PRIVATE_IQ` | كيف يمثّله المحرّك |
|---|---|---|---|
| الأجر الأساسي | سلّم وظيفي (درجة/مرحلة) + علاوة سنوية | مبلغ تعاقدي | `EmployeeCompensation`: إمّا `GradeStepId` أو `BaseSalary` |
| البدلات | قائمة قانونية موحّدة | بدلات العقد (حرّة) | `PayrollComponent` + `SalaryStructure` لكل ملف |
| تأمين اجتماعي | تقاعد موحّد (10٪ + 15٪) | ضمان اجتماعي (5٪ + 12٪…) | `PensionConfiguration` / `SocialSecurityConfiguration` (مؤرّخة) |
| ضريبة الدخل | 113/1982 + تعليمات | 113/1982 (استقطاع صاحب العمل) | `TaxConfiguration` مؤرّخة (إعفاءات + شرائح) — مشتركة، تختلف بالبارامترات |
| العمل الإضافي | مناوبات/ساعات وفق تعليمات الجهة | ≥150٪ وفق قانون العمل | `PayrollComponent` من نوع Overtime بمعدل من الملف |
| الغياب/التأخير | قطع راتب + انضباط (14/1991) | خصم أجر + سجلّ جزاءات (37/2015) | محسوب من الحضور + `AttendancePenaltyPolicy` في الملف |
| العقوبات التأديبية | لفت نظر/إنذار/قطع/إنقاص راتب | غرامات مسقوفة قانوناً + سجلّ | كيان `DisciplinaryPenalty` (مبلغ/أيام/راتب شهر) + تقسيط + سقف شهري |
| نهاية الخدمة | معاش | مكافأة نهاية خدمة | تقرير/بند (v1)، accrual (v2) |
| دورة الدفع | شهرية | شهرية | `PayrollPeriod.PeriodType = Monthly` |
| تقريب المبالغ | حسب تعليمات الجهة | حسب سياسة المنشأة | `PayrollProfile.RoundingRule` |

---

## 7. كيف تعالجها الأنظمة العالمية (مرجعية التصميم)

### 7.1 Odoo — وحدة `hr_payroll`

- **Salary Structure Type** ← **Salary Structure** ← **Salary Rules**.
- **Salary Rule**: كود فريد، فئة (`BASIC / ALLOWANCE / DEDUCTION / GROSS / NET / COMPANY_CONTRIB`)، شرط (ثابت/نطاق/Python)، طريقة مبلغ (ثابت/نسبة/كود Python)، تسلسل، حسابات مدين/دائن للمحاسبة.
- **Contract (`hr.contract`)**: الأجر والبدلات وتواريخ السريان.
- **Worked Days & Other Inputs**: أيام العمل، LWP، ومدخلات لمرة واحدة (مكافأة/عمولة).
- **Rule Parameters**: جداول قيم **مؤرّخة بالتاريخ** (شرائح ضريبة، نسب ضمان) — يُقرأ منها وقت الاحتساب.
- **Payslip (`hr.payslip`)** + سطور، و**Payslip Run** (دفعة/batch).
- **محاسبياً**: كل قاعدة لها حسابات → قيد يومية عند الترحيل؛ **Contribution Registers** لتجميع ذمم كل جهة.

### 7.2 SAP (Business One / HCM)

- **Wage Types (أنواع الأجر)** مصنّفة (استحقاق/استقطاع/مساهمة/إحصائي).
- **Payroll Schema + Rules (PCR)**: خطوات مرتّبة تُعالج أنواع الأجر.
- **Payroll Control Record**: يحكم حالة الفترة (قفل/فتح).
- **Retroactive Accounting**: إعادة احتساب فترات سابقة عند تغيّر بيانات بأثر رجعي.
- في **SAP B1**: عادةً إضافة (Add‑on) رواتب أو تكامل مع نظام خارجي، والنتيجة **قيد إلى دفتر الأستاذ**.

### 7.3 الخلاصة المطبَّقة في Enki

1. **مكوّن راتب مُعرّف بالبيانات** (`PayrollComponent`) ≈ *wage type* / *salary rule*.
2. **هيكل راتب لكل ملف** (`SalaryStructure`) يرتّب المكوّنات ويعيد تعريف طريقتها/حساباتها.
3. **جداول نسب/شرائح مؤرّخة** (`TaxConfiguration`, `PensionConfiguration`, `SocialSecurityConfiguration`) ≈ *Rule Parameters*.
4. **قسيمة + دورة** (`Payslip`, `PayrollRun`) ≈ *payslip* / *payslip run*.
5. **الأثر الرجعي**: يُؤجَّل — يُعالَج كـ `PayrollInput` تسوية في دورة لاحقة (v1)، ثم retro حقيقي (v2).
6. **بدون تفريع كود للنظامين** — الفرق كلّه في صفوف بيانات الملف.

---

## 8. التصميم المقترح في Enki

### 8.0 التغليف: وحدة `Payroll` مستقلة، لا جزء من HR

**الطلب**: أن تكون الرواتب "plugin" منفصلة قابلة للتفعيل/الإزالة، لا مدمجة في HR.

**خيارات التغليف الثلاثة**:

| الخيار | ماهيته | ملاءمته لـ Enki |
|---|---|---|
| **أ. وحدة فرعية داخل `hr`** (مجلدات ضمن `HR.*`) | ما كان مقترحاً سابقاً — schema `hr` نفسه | يبلّغ حجم HR ويربط الدورتين؛ **مرفوض حسب طلبك** |
| **ب. وحدة ABP مستقلة `modules/payroll`** (compile‑time) | مشروع/وحدة كاملة `Payroll.Domain/…/Application`، schema `payroll`، `[DependsOn(typeof(HRApplicationModule), typeof(CoreApplicationModule))]`، migrations عبر `DbMigrator`، يُرجِعها الـ Host بـ ProjectReference، وتُفعَّل/تُطفأ بـ **ABP Feature** `Payroll` لكل مستأجر/إصدار | ✅ **الموصى به** — نفس نمط بقية الوحدات (`finance`, `inventory`…)، حدود نظيفة، إزالتها = إزالة مرجع واحد + تعطيل الـ feature |
| **ج. plugin يُحمَّل وقت التشغيل** (ABP `PlugInSource` / DLL في مجلد) | تجميعة منفصلة تُكتشف ديناميكياً | ⚠️ **غير موصى به** — لا سابقة له في المستودع إطلاقاً (تأكدنا: `AddPlugInSources` غير مستخدَم)، ويصطدم بـ `DbMigrator` وتهيئة Mapster العامة والـ seeders وخطّ الـ CI. يُبقى كخيار مستقبلي فقط لو بيع كـ add‑on تجاري مستقل |

**الموصى به: الخيار (ب)** + **موفّرات نظام كـ plugins برمجية** داخل الوحدة:

- واجهة استراتيجية `IPayrollRegimeProvider` (أو `IStatutoryCalculator`) لكل نظام: `IraqPrivateRegimeProvider`, `IraqGovernmentRegimeProvider` — تُحَل بـ `PayrollProfile.Code`.
- كل ما يمكن التعبير عنه **بيانات** (المكوّنات، الهياكل، جداول النسب/الشرائح) يبقى في قاعدة البيانات؛ الموفّر يحمل فقط الخوارزميات التي **لا** تُختزل لبيانات (تقريب ضريبي خاص، ترتيب استقطاعات، منطق retro، حِزم دول لاحقاً).
- إضافة نظام دولة جديد = موفّر جديد + صفوف seed، بلا لمس المحرّك.

**ما يتغيّر عن المسودّة السابقة** (بسبب الخيار ب):

1. الكيانات كلها في **`Payroll.Domain`** (schema `payroll`)، بادئة جداول `Payroll…`. `EmployeeCompensation` و`EmployeeLoan` و`DisciplinaryPenalty` كلها في وحدة `payroll` (شؤون رواتب)، لا HR. HR يبقى مالك `Employee`/`Attendance`/`Leave`/`Holiday` فقط.
2. **HR يجب أن يكشف عقود قراءة** (integration contracts) تستهلكها الرواتب: لقطة الموظف، ملخّص الحضور للفترة، أيام LWP، تقويم العطل. اليوم HR يملك `Integrations/*IntegrationService` جزئية فقط (Employee/JobTitle/Position/EmployeeReceivable) — الحضور/الإجازات **غير مكشوفة**. هذه فجوة جديدة (قسم 9).
3. الاتجاه: `payroll` → يعتمد على `hr` و`core`. لا يعتمد أيّهما على `payroll`.
4. التكامل المالي دون تغيير — عبر `Core.Application.Contracts`.
5. `DbMigrator` يضيف `PayrollDbContext` + schema `payroll`؛ الـ Host يضيف ProjectReference + الوحدة في سلسلة `[DependsOn]`.
6. **ABP Feature `Payroll.Enabled`** يخفي كل واجهات/صلاحيات الرواتب حين إطفائه.

### 8.1 المبادئ

- **وحدة ABP مستقلة `modules/payroll`** (schema `payroll`)، تعتمد على `hr` و`core`، `decimal(19,6)`، اتفاقيات المشروع كاملة، خلف feature flag `Payroll`.
- Aggregates بمصانع (Factory) و`Id` عبر `base(id)` ([[entity-ctor-base-id]])، primary constructors للـ handlers/services ([[primary-constructors-preference]]).
- CQRS + AppService رفيع (mediator delegates) ([[thin-appservice-cqrs-reference]])، Contracts في `Commands/Queries/Dtos` ([[feature-contracts-folder-structure]]).
- Mapster عبر التهيئة العامة للوحدة ([[global-mapster-config-pattern]]).
- كل رسالة عبر `IStringLocalizer` + `en/ar.json`، و`UserFriendlyException` ([[localize-user-facing-messages]] · [[prefer-userfriendlyexception]]).
- المدقّقات (Validators) بلا وصول للمخزن؛ فحوص القاعدة في الـ handler ([[no-store-access-in-validators]]).
- استعلامات القوائم تستدعي `.ApplyDataAuthority(currentUser)` ([[data-authority-query-convention]]).
- التكامل المالي عبر `Core.Application.Contracts` فقط (لا مرجع مباشر إلى `Finance`).

### 8.2 نموذج المجال (Entities)

> ملاحظة: كل الكيانات في وحدة `payroll` المستقلة (schema `payroll`)، بادئة جداول `Payroll…`. كل كيان `MultiTenantAuditedAggregateRootWithUserAndOrgBase<Guid>` ما لم يُذكر خلاف ذلك. حيثما ورد لاحقاً "كيان جديد في HR" فالمقصود **وحدة `payroll`** بعد قرار التغليف (قسم 8.0).

| # | الكيان | الدور | حقول رئيسية | حدود الـ Aggregate |
|---|---|---|---|---|
| 1 | **PayrollComponent** | بند راتب (wage type) | `Code`, `Name(L)`, `ComponentType` (Earning/Deduction/EmployerContribution/Informational), `Category` (Basic/Allowance/Overtime/Bonus/StatutoryPension/StatutorySocialSecurity/IncomeTax/LoanRepayment/UnionDues/**AbsenceDeduction**/**LatenessDeduction**/**DisciplinaryPenalty**/CourtOrder/Other), `CalculationMethod` (FixedAmount/PercentOfBase/Formula/RateTable/AttendanceDriven/Manual), `PercentValue?`, `BaseComponentCodes` (وعاء النسبة), `IsTaxable`, `IsPensionable`, `IsSocialSecurityBase`, `IsProratable`, `ReducesGross` (خصم الغياب/التأخير = true؛ العقوبة = false), `ExpenseAccountCode?`, `PayableAccountCode?`, `Sequence`, `IsActive` | جذر مستقل |
| 2 | **PayrollProfile** | ملف النظام (حكومي/خاص) | `Code` (GOVERNMENT_IQ/PRIVATE_IQ), `Name(L)`, `EnablePension`, `EnableSocialSecurity`, `EnableIncomeTax`, `PayFrequency`, `RoundingRule`, `CurrencyCode`, `CutoffDay`, `OvertimeMultiplierNormal/Rest/Holiday`, `DayRateBasis` (CalendarDays/WorkingDays)، **`AttendancePenaltyPolicy`** (owned): `GraceMinutes`, `LatenessMethod` (PerMinute/Tiers/CountBased), `LatenessTiersJson`, `LatenessRatePerMinute?`, `MaxLateEventsBeforeDayCut?`, `AbsenceDayRateComponentCodes`, `MaxMonthlyDeductionPercent`, `OverBreachAction` (AutoSpread/Block) | جذر؛ يرجع إليه الباقي بـ `ProfileId` |
| 3 | **SalaryStructure** (+ `SalaryStructureLine`) | ترتيب المكوّنات لملف | `Code`, `Name(L)`, `ProfileId`, `EffectiveFrom/To`; السطر: `ComponentId`, `OverrideMethod?`, `OverrideAmount?`, `OverridePercent?`, `OverrideExpenseAccountCode?`, `OverridePayableAccountCode?`, `Sequence` | جذر + سطوره |
| 4 | **GovtGradeScale** (+ `GovtGradeStep`) | السلّم الوظيفي | Scale: `Code`, `Name(L)`, `ProfileId`, `EffectiveFrom`; Step: `Grade` (1–10), `Step` (1–N), `NominalSalary`, `AnnualIncrementAmount` | جذر + سطوره |
| 5 | **EmployeeCompensation** (+ `EmployeeCompensationComponent`) | تعيين الراتب للموظف — **جوهري** | `EmployeeId`, `ProfileId`, `SalaryStructureId`, `EffectiveFrom/To`, `CurrencyCode`, `PaymentMethod` (Bank/Cash), `BankAccountNo?`, `CostCenterId?`, `ProjectId?`, `GradeStepId?` (govt) أو `BaseSalary?` (private), `TaxMaritalStatus`, `EligibleChildrenCount`, `IsPensionExempt?`; السطر: `ComponentId`, `Amount?`/`Percent?` (تجاوز لموظف: بدل سكن تعاقدي، مخصصات منصب فعلية) | جذر + سطوره؛ **سجلّ تاريخي**: كل تغيير سجلّ جديد بـ `EffectiveFrom` |
| 6 | **TaxConfiguration** (+ `TaxBracket`, `TaxExemption`) | جدول الضريبة المؤرّخ | `ProfileId`, `EffectiveFrom`, `CalcBasis` (MonthlyDirect/Annualized), `CurrencyCode`; Exemption: `Kind` (Personal/Married/Spouse/PerChild/AgeOver63/Disability), `AnnualAmount`; Bracket: `FromAmount`, `ToAmount?`, `Rate` | جذر + سطوره |
| 7 | **PensionConfiguration** | تقاعد (حكومي) مؤرّخ | `ProfileId`, `EffectiveFrom`, `EmployeeRate`, `EmployerRate`, `BaseComponentCodes`, `EmployeePayableAccountCode`, `EmployerExpenseAccountCode`, `EmployerPayableAccountCode` | جذر |
| 8 | **SocialSecurityConfiguration** | ضمان (خاص) مؤرّخ | مثل التقاعد + `EstablishmentFileNo`, `RemittanceCycle`, نسب حسب فئة النشاط (`ActivityRateOverrides`) | جذر |
| 9 | **PayrollPeriod** | فترة رواتب | `ProfileId`, `PeriodType`, `Year`, `SequenceNo`, `StartDate`, `EndDate`, `PayDate`, `PostingPeriodId` (Core), `Status` (Open/Locked/Closed) | جذر |
| 10 | **PayrollRun** (+ `Payslip` + `PayslipLine`) | دورة الرواتب — الجذر الرئيسي | `RunNo`, `ProfileId`, `PayrollPeriodId`, `OrganizationId`, `RunType` (Regular/OffCycle/Bonus/Adjustment), `ScopeFilterJson`, `Status` (Draft/Calculated/PendingApproval/Approved/Posted/Paid/Reversed), `GrossTotal`, `DeductionTotal`, `NetTotal`, `EmployerCostTotal`, `JournalEntryId?`, `JournalRef?`, `BaseType="PAYRUN"`, `ReversalRunId?` | جذر + قسائمه + سطورها |
| 11 | **Payslip** | قسيمة موظف ضمن دورة | `RunId`, `EmployeeId`, `CompensationId`, `CurrencyCode`, `WorkedDays`, `PaidLeaveDays`, `UnpaidLeaveDays`, `OvertimeHours`, `AbsenceDays`, `GrossPay`, `TaxableBase`, `PensionableBase`, `SocialSecurityBase`, `IncomeTax`, `TotalEmployeeDeductions`, `NetPay`, `EmployerCost`, `PaymentMethod`, `BankAccountNo`, `PaidStatus`, `PaidDate?`, `PaymentDocRef?` | جزء من `PayrollRun` |
| 12 | **PayslipLine** | سطر بند في القسيمة | `ComponentId`, `ComponentCode/Name` (snapshot), `ComponentType`, `Category`, `Base`, `Rate?`, `Quantity?`, `Amount`, `IsEmployerContribution`, `ExpenseAccountCode`, `PayableAccountCode`, `Sequence`, `Source` (Structure/Override/Input/Loan/Statutory), `Remark?` | جزء من `Payslip` |
| 13 | **PayrollInput** | مدخل لمرة واحدة | `PayrollPeriodId`, `EmployeeId`, `ComponentId`, `Amount?`, `Quantity?`, `Reason`, `Status` (Pending/Applied/Cancelled), `AppliedRunId?` | جذر |
| 14 | **EmployeeLoan** (+ `EmployeeLoanInstallment`) | سلفة/قرض موظف يُسترَدّ من الراتب — **كيان في وحدة `payroll`، المصدر الوحيد لاستقطاعات الموظف الشخصية** | Loan: `LoanNo`, `EmployeeId`, `LoanType` (PersonalLoan/SalaryAdvance), `LoanDate`, `Principal`, `CurrencyCode`, `InterestType` (None/Flat), `InterestRate?`, `TotalRepayable`, `RepaymentMethod` (FullNextPayroll/Installments), `InstallmentCount`, `InstallmentAmount`, `FirstDeductionPeriodId`, `OutstandingBalance`, `Status` (Draft/PendingApproval/Approved/Disbursed/Active/Settled/Cancelled), موافقة/رفض tracking, `GuarantorEmployeeId?`, `Reason`, `CostCenterId?`, `LoanReceivableAccountCode` (أصل), `DisbursementAccountCode` (نقد/بنك), `JournalEntryId?`, `Comments?`. Installment: `LoanId`, `SeqNo`, `DuePeriodId`/`DueDate`, `Amount`, `DeductedAmount`, `Status` (Pending/Deducted/Waived/Deferred), `PayslipId?`, `DeductedOn?` | جذر + أقساطه؛ الصرف يُرحّل قيداً (Dr قرض / Cr نقد) |
| 15 | **DisciplinaryPenalty** (+ `DisciplinaryPenaltyInstallment` عند التقسيط) | عقوبة تأديبية مالية على موظف — سجلّ العقوبات | `PenaltyNo`, `EmployeeId`, `PenaltyType` (FixedAmount/DaysOfPay/OneMonthSalary/PercentOfSalary), `Value` (مبلغ أو عدد أيام أو نسبة), `ComputedAmount`, `Reason`, `DecisionRef`, `DecisionDate`, `IssuedByUserId`, `SpreadOverMonths` (1..N), `StartPeriodId`, `RemainingAmount`, `Status` (Draft/Approved/Applying/Applied/Cancelled), موافقة tracking. Installment: `PenaltyId`, `SeqNo`, `DuePeriodId`, `Amount`, `DeductedAmount`, `Status`, `PayslipId?` | جذر + أقساطه (إن وُجدت) |
| 16 | **PayrollDeductionScheduleItem** *(جسر اختياري)* | "المستحق هذا الشهر" لكل موظف من كل مصدر | `EmployeeId`, `PayrollPeriodId`, `SourceType` (EmployeeLoan/DisciplinaryPenalty/CourtOrder/Manual), `SourceId`, `Amount`, `Status`, `AppliedRunId?` | جذر |
| 17 | **EndOfServiceCalculation** | احتساب نهاية الخدمة عند الانفكاك (خاص) — بند/تقرير لمرة واحدة | `EmployeeId`, `TerminationDate`, `ServiceYears`, `LastWage`, `GratuityAmount`, `AccruedLeavePay`, `TotalAmount`, `Status` | جذر (accrual الشهري لاحقاً — v2) |

**قرار نمذجة**: مبلغ الراتب لا يُوضع على `Employee` — يبقى في `EmployeeCompensation` المؤرّخ حفاظاً على السجلّ التاريخي و proration التغييرات وسطر تدقيق نظيف.

### 8.3 خط أنابيب الحساب (`PayrollCalculationService` — domain service)

```
INPUT: PayrollRun (ProfileId, PayrollPeriodId, نطاق الموظفين)

1. resolveEmployees()      → الموظفون ضمن النطاق + EmployeeCompensation النافذ بتاريخ الفترة
2. loadTimeData()          → من Attendance/LeaveTransaction/Holiday:
                             WorkedDays, PaidLeaveDays, UnpaidLeaveDays(LWP), OvertimeHours, AbsenceDays
3. computeEarnings()       → لكل SalaryStructureLine (نوع Earning):
                             - Basic: govt = NominalSalary(GradeStep) ؛ private = BaseSalary
                             - Allowance: FixedAmount | PercentOfBase(BaseComponentCodes) | Override(EmployeeCompensationComponent)
                             - Proration: إن IsProratable ⇒ × (WorkedDays+PaidLeaveDays) / PeriodWorkingDays
                             - Overtime: OvertimeHours × hourlyRate × Profile.OvertimeMultiplier*
                             - PayrollInput (مكافأة/تسوية) من نوع Earning
                             ⇒ GrossEarnings
3.5 attendanceDeductions() → DayRate = Basis(الأساسي[+بدلات محدّدة]) ÷ (أيام الشهر أو أيام العمل حسب Profile.DayRateBasis)
                             - AbsenceDeduction  = DayRate × AbsenceDays (غياب غير مبرَّر)
                             - LatenessDeduction = f(دقائق التأخير, AttendancePenaltyPolicy: GraceMinutes/Method/Tiers)
                             ⇒ GrossPay = GrossEarnings − AbsenceDeduction − LatenessDeduction   (ReducesGross=true)
4. computeBases()          → PensionableBase / SocialSecurityBase / TaxableGross = Σ البنود بحسب أعلامها
                             (محسوبة على GrossPay بعد خصم الغياب/التأخير)
5. statutoryDeductions()
   - govt  : Pension.EmployeeRate × PensionableBase  (+ سطر EmployerContribution بـ EmployerRate)
   - private: SocialSecurity.EmployeeRate × SSBase   (+ سطر EmployerContribution)
   - IncomeTax:
       taxableNet = TaxableGross − (حصة التقاعد/الضمان إن نصّ القانون)
       بعد الإعفاءات الشهرية (Personal/Married/Spouse/PerChild…) ⇒ تطبيق TaxBracket المتتالية
6. otherDeductions()      → أقساط/سلف EmployeeLoan + أقساط DisciplinaryPenalty المستحقة + اقتطاعات قضائية
                             + نقابة + PayrollInput من نوع Deduction   (عبر PayrollDeductionScheduleItem)
6.5 netProtection()       → cap = GrossPay × AttendancePenaltyPolicy.MaxMonthlyDeductionPercent
                             إن (عقوبات + قضائي + أقساط قروض) > cap ⇒ حسب OverBreachAction:
                               AutoSpread: رحّل الفائض من DisciplinaryPenalty/EmployeeLoan إلى الفترة التالية
                               Block: أوقف الاحتساب لهذا الموظف واطلب مراجعة
7. totals()               → NetPay = GrossPay − Σ استقطاعات الموظف (القانونية + الأخرى)
                             EmployerCost = GrossEarnings + Σ مساهمات رب العمل
8. round()                → حسب Profile.RoundingRule ؛ توليد PayslipLine مرتّبة ؛ Payslip.totals
9. validate()             → NetPay ≥ 0، الفترة Open، لا موظف بلا Compensation، السقف الشهري محترَم

OUTPUT: Payslips + PayslipLines + Run.totals ؛ Run.Status = Calculated
```

### 8.4 القيود المحاسبية (GL Posting)

عند `Approve → Post`: تُبنى `JournalEntryPostDto` (واحدة للدورة، أو واحدة لكل `CostCenter` — قرار مفتوح #4) وتُرحّل عبر `IJournalEntryIntegrationAppService.PostAsync`.

**نموذج القيد** (لكل تجميع):

| الطرف | الحساب | المبلغ |
|---|---|---|
| مدين | مصروف الرواتب والأجور (Salary & Wages Expense) | `GrossTotal` *(صافٍ بعد خصم الغياب/التأخير — `ReducesGross`)* |
| مدين | مصروف حصة رب العمل — تقاعد/ضمان (Employer Pension/SS Expense) | `EmployerContribTotal` |
| دائن | أمانات ضريبة الدخل (Income Tax Payable) | `IncomeTaxTotal` |
| دائن | أمانات التقاعد/الضمان (Pension/SS Payable) — حصة الموظف + حصة رب العمل | `EmployeeSS + EmployerSS` |
| دائن | قروض وسلف الموظفين المدينة (`EmployeeLoan.LoanReceivableAccountCode`) | `LoanRepaymentTotal` |
| دائن | إيراد الغرامات والعقوبات / خصم من المصروف (Disciplinary Penalties) | `PenaltyTotal` |
| دائن | اقتطاعات قضائية مستحقة التوريد (Court Orders Payable) | `CourtOrderTotal` |
| دائن | رواتب مستحقة الدفع (Net Salaries Payable) | `NetTotal` |

- كل سطر يحمل `EmployeeId` + `CostCenterId` + `ProjectId` + `BaseType="PAYRUN"` + `BaseEntry=RunId` + `BaseRef=RunNo` + `FiscalPeriodId=PayrollPeriod.PostingPeriodId` + `IsAutoGenerated=true`.
- الحسابات تُشتق من `PayslipLine.ExpenseAccountCode` / `PayableAccountCode` (snapshot) ← `SalaryStructureLine` override ← `PayrollComponent` ← (للقانونية) `Pension/SocialSecurityConfiguration`.
- **الدفع** (خارج نطاق الرواتب): `PaymentVoucher`/`OutgoingPayment` في Finance يقفل «رواتب مستحقة الدفع» مقابل النقد/البنك، ويحدّث `Payslip.PaidStatus` عبر ربط راجع.
- **التوريد**: دفعات لاحقة من Finance لجهات الدولة تقفل حسابات الأمانات.
- **العكس**: `PayrollRunReverseCommand` ⇒ قيد عكسي (`IsReversal=true`) + `Run.Status=Reversed` + إعادة فتح أقساط `EmployeeLoanInstallment` المخصومة في الدورة (`→ Pending`) وإرجاع `OutstandingBalance`.

### 8.4.1 سلف وقروض الموظفين (`EmployeeLoan`) — كيان جديد

- **النطاق**: المصدر **الوحيد** لأي مبلغ يُسترَدّ من راتب الموظف — `LoanType.PersonalLoan` (قرض بأقساط) و`LoanType.SalaryAdvance` (سلفة على الراتب تُسدَّد كاملة في راتب الشهر التالي: `RepaymentMethod.FullNextPayroll`).
- **دورة الحياة**: `Draft → PendingApproval → Approved → Disbursed → Active → Settled` (+ `Cancelled`)، بنمط مشابه لـ [`AdvanceRequest`](../../../jasim_api/modules/finance/src/Finance.Domain/Entities/Advances/EmployeeAdvances/AdvanceRequest.cs) — **دون أي تكامل معه**، مرجع تصميمي فقط.
- **جدول الأقساط**: يُولَّد عند الاعتماد — للقرض: (`Principal` + فائدة اختيارية) ÷ `InstallmentCount` من `FirstDeductionPeriodId` (القسط الأخير يمتصّ التقريب)؛ للسلفة: قسط واحد بكامل المبلغ في الفترة التالية.
- **الصرف (`Disburse`)**: يُرحّل قيداً عبر `IJournalEntryIntegrationAppService` — `من ح/ قروض وسلف الموظفين المدينة (أصل)` / `إلى ح/ النقد أو المصرف`، نوع الوثيقة `EMPLOAN`.
- **الاستقطاع في الراتب**: محرّك الرواتب يلتقط أقساط `Status = Pending` المستحقة ضمن فترة الدورة عبر `PayrollDeductionScheduleItem`، ويضعها كبند استقطاع في القسيمة. عند `Post`: القسط `→ Deducted` (مع `PayslipId`)، و`OutstandingBalance -= القسط`، وسطر القيد `إلى ح/ قروض وسلف الموظفين المدينة`. عند بلوغ الرصيد صفراً `→ Settled`.
- **تسوية مبكرة**: أمر `EmployeeLoanEarlySettleCommand` يقفل الأقساط المتبقية دفعة واحدة (مقابل نقد/راتب) — قرار مصدر السداد أثناء التنفيذ.
- **عكس دورة رواتب**: يُعيد الأقساط المخصومة فيها إلى `Pending` ويُرجع الرصيد.
- **ملكية البيانات**: كيان كامل داخل وحدة `payroll`، لا يمسّ `EmployeeReceivable` ولا `Finance.AdvanceRequest` إطلاقاً.

### 8.5 التكامل مع الوحدات

| الوحدة | نقطة التكامل | الاتجاه |
|---|---|---|
| **HR** (يعتمد عليه `payroll`) | عبر عقود قراءة: `IEmployeePayrollSnapshotProvider`, `IAttendancePeriodSummaryProvider` (حضور/غياب/دقائق تأخير), `ILeavePeriodProvider` (LWP), `IHolidayCalendarQuery` — تُنفَّذ في `HR.Application/Integrations` | `payroll` → `hr` (قراءة فقط). `EmployeeReceivable` و`Finance.AdvanceRequest` **غير مستخدَمين** |
| **Finance** | `IJournalEntryIntegrationAppService` (ترحيل الرواتب + صرف `EmployeeLoan`)، `PaymentVoucher`/`OutgoingPayment` (دفع صافي الرواتب والتوريدات)، `GeneralLedgerAccount`, `CostCenter` | عبر `Core.Application.Contracts` + عقود تكامل Finance |
| **Core** | `Organization` (النطاق)، `Currency`، `PostingPeriod` (الفترة)، `DocumentType` (`PAYRUN`, `EMPLOAN`)، `DataAuthority`، ABP `Feature` (`Payroll`) | مباشر |
| **Reporting** | `.repx` لقسيمة الراتب + كشف الرواتب + كشوف التوريد؛ إدخال في `ReportDataSeeder` | نمط التقارير القائم |

### 8.6 الواجهة الأمامية (`jasim_web`)

- **Type A (master‑detail)** لدورة الرواتب `pages/hr/payroll/runs/[id].vue`: رأس + شبكة القسائم + تفصيل سطور القسيمة، أزرار `Calculate / Approve / Post / Reverse` عبر `XView` actions (إخفاء أزرار غير المتعلقة كما في [[report-page-xview-hide-actions]] عند اللزوم).
- **Type B CRUD**: `PayrollComponent`, `SalaryStructure`, `PayrollProfile` (+ تبويب `AttendancePenaltyPolicy`), `GovtGradeScale`, `TaxConfiguration`, `Pension/SocialSecurityConfiguration`, `PayrollPeriod`, `PayrollInput`.
- **EmployeeLoan** (Type A مصغّر): صفحة السلف والقروض — رأس + جدول الأقساط + أزرار `Approve / Disburse / Cancel` + «تسوية مبكرة».
- **DisciplinaryPenalty** (Type B + تقسيط): صفحة العقوبات — `PenaltyType`، السبب، `DecisionRef`، `SpreadOverMonths`، اعتماد؛ + تقرير **سجلّ العقوبات**.
- **EmployeeCompensation**: تبويب داخل صفحة الموظف + شبكة سجلّ تاريخي + نموذج «تعيين راتب جديد اعتباراً من تاريخ».
- **تقارير**: قسيمة راتب فردية (PDF/repx)، كشف رواتب شهري، ملف تحويل مصرفي (تصدير)، كشوف توريد (ضريبة/تقاعد/ضمان).
- **CASL**: subjects `hr.payroll.component`, `hr.payroll.structure`, `hr.payroll.run`, `hr.payroll.config`, `hr.payroll.compensation`, `hr.payroll.loan`, `hr.payroll.penalty` بأفعال `view/create/update/delete/calculate/approve/disburse/post/reverse`.
- i18n عربي/إنجليزي لكل النصوص، RTL، تنسيق مبالغ بالدينار.

---

## 9. التغييرات المطلوبة على ما هو قائم

1. **إنشاء وحدة ABP `modules/payroll`**: مشاريع `Payroll.Domain / .Domain.Shared / .Application.Contracts / .Application / .EntityFrameworkCore`، `PayrollModule` بـ `[DependsOn(typeof(HRApplicationModule), typeof(CoreApplicationModule), …)]`، `PayrollDbContext` + schema `payroll`، تسجيلها في `DbMigrator` والـ Host (ProjectReference + `[DependsOn]`).
2. **ABP Feature `Payroll`**: عقدة feature تُخفي كل صلاحيات/واجهات/قوائم الرواتب عند إطفائها؛ تُفحص في الـ AppServices والـ nav والـ CASL.
3. **مرجع `Payroll.Application` → `Core.Application.Contracts`** (لـ `IJournalEntryIntegrationAppService` + `PostingPeriod`).
4. **عقود قراءة من HR**: في `HR.Application.Contracts` (تنفيذها في `HR.Application/Integrations`) — `IEmployeePayrollSnapshotProvider`, `IAttendancePeriodSummaryProvider` (أيام حضور/غياب/تأخير بالدقائق لفترة)، `ILeavePeriodProvider` (أيام LWP)، `IHolidayCalendarQuery`. هذه **جديدة** — الموجود يغطّي Employee/JobTitle/Position فقط.
5. **`GeneralLedgerAccountSeedData`**: حسابات جديدة — مصروف رواتب وأجور، مصروف حصة رب العمل، أمانات ض. الدخل، أمانات التقاعد، أمانات الضمان، **قروض وسلف الموظفين المدينة (أصل)**، **إيراد الغرامات والعقوبات**، **اقتطاعات قضائية مستحقة التوريد**، رواتب مستحقة الدفع.
6. **`DocumentType`**: `PAYRUN` + `EMPLOAN` (صرف سلفة/قرض موظف) — بترقيم تسلسلي.
7. **Seed بيانات مرجعية**: ملفّان (`GOVERNMENT_IQ`, `PRIVATE_IQ`)، مكوّنات قياسية، سلّم وظيفي حكومي مبدئي، جداول ضريبة/تقاعد/ضمان أولية **قابلة للتعديل من الواجهة**.
8. **`PostingPeriod`**: ربطه بدورة الرواتب والقيد.
9. **موفّرات الأنظمة (regime providers)**: واجهة `IPayrollRegimeProvider` + تنفيذ لكل نظام (`IraqPrivate…`, `IraqGovernment…`) يُحَل بـ `PayrollProfile.Code`.
10. **الكيانات في وحدة `payroll`**: `EmployeeCompensation`, `EmployeeLoan` (+`Installment`), `DisciplinaryPenalty` (+`Installment`) + تقرير سجلّ العقوبات — **كلها في `payroll` لا `hr`**.
11. **صلاحيات** جديدة في `PayrollPermissions` تحت عقدة `Payroll` (`Component/Structure/Config/Compensation/Run/Loan/Penalty`).
12. **Mapster**: تهيئة `TypeAdapterConfig` عامة لوحدة `payroll` ([[global-mapster-config-pattern]]).

---

## 10. خطة التنفيذ على مراحل (Roadmap)

| Phase | المخرجات | الكيانات/الملفات | subagents | التبعية | معيار القبول |
|---|---|---|---|---|---|
| **0 — قرارات وبيانات قانونية** | نسخة معتمدة من هذه الدراسة + جداول النسب/الشرائح/الإعفاءات الحالية من مصادر رسمية + حسم قسم 11 | هذا المستند | — | — | كل قرارات قسم 11 محسومة وموثّقة بأرقام مصدرها |
| **1أ — سقالة الوحدة** | مشاريع `modules/payroll/*` + `PayrollModule` (`[DependsOn]` HR+Core) + `PayrollDbContext` (schema `payroll`) + تسجيل في `DbMigrator` والـ Host + ABP Feature `Payroll` + عقود القراءة من HR (`IAttendancePeriodSummaryProvider` وأخواتها) + تنفيذها في `HR.Application/Integrations` | مشاريع + module classes + feature + integration contracts | `jasim-devops` → `jasim-hr` → `jasim-migrations` → `jasim-reviewer` | 0 | الوحدة تبني وتُهاجر؛ الـ feature يُخفي كل شيء عند الإطفاء؛ عقود HR تُرجع بيانات فترة صحيحة |
| **1ب — الأساس والمرجعيات (Backend)** | CRUD كامل لـ `PayrollComponent`, `PayrollProfile` (+`AttendancePenaltyPolicy`), `SalaryStructure`, `TaxConfiguration`, `Pension/SocialSecurityConfiguration` + `IPayrollRegimeProvider` (هيكل + تنفيذ خاص) + seed أولي | Domain + Contracts (`Commands/Queries/Dtos`) + thin AppService + permissions + `en/ar.json` + EF configs + migration (`payroll`, decimal 19,6) | `jasim-hr` → `jasim-migrations` → `jasim-tester` → `jasim-reviewer` | 1أ | migration مطبّقة؛ seed يُنشئ الملفّين؛ اختبارات handler خضراء |
| **2 — تعويض الموظف والسلّم والسلف/القروض** | `GovtGradeScale/Step` + `EmployeeCompensation` (+overrides + history) + **`EmployeeLoan` (+`EmployeeLoanInstallment`) CRUD + `LoanType` قرض/سلفة + توليد جدول الأقساط + موافقة** (كلها في وحدة `payroll`) + تبويب في صفحة الموظف + صفحة السلف والقروض + استيراد Excel للرواتب الحالية | Domain + CQRS + frontend | `jasim-hr` → `jasim-migrations` → `vue3-erp-developer` → `jasim-frontend-reviewer` | 1ب | تعيين راتب مؤرّخ صحيح؛ إنشاء قرض/سلفة بجدول أقساط واعتماده |
| **3 — محرّك الحساب والدورة (بلا محاسبة)** | `PayrollPeriod` (يدعم `PeriodType` شهري/أسبوعي/يومي — اختبار مُعمّق على الشهري)، `PayrollRun`, `Payslip`, `PayslipLine`, `PayrollInput` + `PayrollCalculationService` + سير `Draft→Calculate→Approve` + تكامل الحضور/الإجازات + **خصم الغياب والتأخير من `Attendance` وفق `AttendancePenaltyPolicy`** | Domain service + CQRS + Type A run page | `jasim-hr` → `jasim-tester` → `vue3-erp-developer` → `jasim-reviewer` | 2 | golden tests للقطاع الخاص (قسم 12.2) تعطي نفس الأرقام المعتمدة؛ خصم غياب/تأخير صحيح |
| **4 — الاستقطاعات القانونية الكاملة** | ضريبة الدخل (إعفاءات + شرائح) + التقاعد (حكومي) + الضمان (خاص) + كشوف التوريد | تمديد `PayrollCalculationService` + تقارير التوريد | `jasim-hr` → `jasim-tester` → `jasim-report-builder` → `jasim-reviewer` | 3 | golden tests للنظامين (12.1 و12.2) خضراء |
| **5 — التكامل المحاسبي** | `PayrollPostingService` (عبر `IJournalEntryIntegrationAppService`) + توليد قيد الرواتب عند `Post` + **قيد صرف `EmployeeLoan` (Dr قرض / Cr نقد)** + ربط `PostingPeriod` + `Reverse` + seed الحسابات و`DocumentType` (`PAYRUN`, `EMPLOAN`) | posting service + commands `Post/Reverse/Disburse` | `jasim-hr` → `jasim-migrations` (seed) → `jasim-tester` (ABP integration) → `jasim-reviewer` | 4 | قيد متوازن يُنشأ ويُعكَس؛ صرف القرض يُرحّل قيداً؛ اختبار تكامل ABP يمرّ |
| **6 — استقطاع السلف/القروض والعقوبات والمدخلات** | استقطاع أقساط/سلف `EmployeeLoan` + `DisciplinaryPenalty` (+ تقسيط) + الاقتطاعات القضائية في القسيمة + قفل القسط وتخفيض الرصيد عند `Post` + **قاعدة سقف الاستقطاع الشهري (`netProtection`) + تدوير الفائض** + `PayrollDeductionScheduleItem` + «تسوية مبكرة» + سجلّ العقوبات + UI مدخلات | جسر الاستقطاعات + `DisciplinaryPenalty` + `PayrollInput` UI | `jasim-hr` → `jasim-tester` → `jasim-reviewer` | 5 | قسط/سلفة/عقوبة تُستقطع وتُقفَل؛ عقوبة راتب شهر تُقسَّط وفق السقف؛ عكس الدورة يُعيد الفتح |
| **7 — التقارير والدفع ونهاية الخدمة** | قسيمة راتب `.repx` + كشف رواتب + ملف تحويل مصرفي + كشوف توريد + **`EndOfServiceCalculation` (احتساب عند الانفكاك) + تقريره** + ربط الدفع بـ `PaymentVoucher`/`OutgoingPayment` (تحديث `PaidStatus`) | مجلد لكل تقرير + `ReportDataSeeder` + ربط دفع | `jasim-report-builder` → `jasim-finance` → `vue3-erp-developer` → `jasim-reviewer` | 5 | قسيمة تُطبع بأرقام صحيحة؛ نهاية الخدمة تُحتسب صحيحاً؛ حالة الدفع تنعكس بعد سند الدفع |
| **8 — الواجهة الكاملة والصلاحيات والتلميع** | كل صفحات Type B + صفحة الدورة Type A + صفحة القروض + CASL + nav + i18n + RTL | frontend كامل | `vue3-erp-developer` → `jasim-frontend-reviewer` | 3–7 | تدقيق الواجهة نظيف؛ typecheck/lint/build/tests خضراء |
| **9 — تحسينات (لاحق)** | الأثر الرجعي (retro payroll)، مخصّص نهاية الخدمة الشهري (accrual + قيد التزام)، تعدّد العملات، ملفات الجهات الرسمية، أرشفة/توقيع | — | حسب البند | 8 | لكل بند قبول مستقل |

---

## 11. القرارات المفتوحة (تحتاج إدخالك)

| # | القرار | التوصية |
|---|---|---|
| 1 | نبدأ بملف **القطاع الخاص** أم **الحكومي**؟ | الخاص أولاً — أبسط (لا سلّم وظيفي)، يثبّت المحرّك بسرعة. |
| 2 | هل تشغّل نفس المنشأة النظامين معاً (دائميون + عقود)؟ | نعم — الملف (`ProfileId`) على مستوى `EmployeeCompensation`، لا المستأجر. |
| 3 | سلف وقروض الموظفين المستردَّة من الراتب | ✅ **محسوم**: كيان **`EmployeeLoan` جديد في وحدة `payroll`** (+ `EmployeeLoanInstallment`، `LoanType` قرض/سلفة، دورة موافقة/صرف يُرحّل قيداً) هو المصدر الوحيد. **`EmployeeReceivable` و`Finance.AdvanceRequest` (سلف النشاط الجاري) خارج نطاق الرواتب نهائياً** — الأخيرة سلف مؤسسية لأغراض المشتريات، تسويتها شأن مالي بحت. |
| 4 | تجميع القيد المحاسبي: قيد واحد للدورة / لكل مركز كلفة / لكل موظف؟ | قيد واحد لكل **مركز كلفة** (توازن بين التفصيل والحجم). |
| 5 | أساس احتساب الضريبة: شهري مباشر أم سنوي مُوزّع (annualized)؟ | شهري مباشر في v1؛ `TaxConfiguration.CalcBasis` يترك الخيار. |
| 6 | السلّم الحكومي: إدخال الجداول كاملة (10 درجات × مراحل) أم الاسمي يدوياً لكل موظف؟ | إدخال الجداول كاملة كـ seed + تحرير من الواجهة. |
| 7 | دعم الأثر الرجعي (retro) في v1؟ | لا — تسوية عبر `PayrollInput` في الدورة التالية. |
| 8 | مخصّص نهاية الخدمة: accrual شهري أم احتساب عند الانفكاك فقط؟ | عند الانفكاك فقط في v1 (تقرير/بند). |
| 9 | العمل الإضافي الحكومي: ضمن الرواتب أم مطالبات منفصلة؟ | بند اختياري في الملف الحكومي، مُطفأ افتراضياً. |
| 10 | تقريب المبالغ: لأقرب دينار / 250 / 500 / 1000؟ | لأقرب 250 ديناراً (قابل للتغيير في `RoundingRule`). |
| 11 | مصدر الحالة الاجتماعية وعدد الأطفال للضريبة: من `Employee` أم حقول مستقلة في `EmployeeCompensation`؟ | حقول في `EmployeeCompensation` (`TaxMaritalStatus`, `EligibleChildrenCount`) مع افتراض مبدئي من `Employee`. |
| 12 | تعدّد العملات في الدورة؟ | لا في v1 — دينار فقط، مع ترك `CurrencyCode` على الكيانات. |
| 13 | تثبيت نسب/شرائح: نسخة قانون 39/1971 أم 18/2023 للضمان؟ | تثبيت 18/2023 إن كان نافذاً؛ الحقول المؤرّخة تسمح بالتحوّل. |
| 14 | أساس معدّل اليوم لخصم الغياب: أيام الشهر التقويمية أم أيام العمل؟ | أيام العمل (`Profile.DayRateBasis = WorkingDays`). |
| 15 | طريقة خصم التأخير: بالدقيقة / شرائح زمنية / عدد مرات؟ + فترة السماح | شرائح زمنية + فترة سماح 10 دقائق (قابلة للضبط في `AttendancePenaltyPolicy`). |
| 16 | سقف مجموع الاستقطاعات (عقوبات + قضائي + أقساط) الشهري كنسبة من الأجر؟ | يُثبّت من القانون في Phase 0؛ افتراض مبدئي 25٪. |
| 17 | عند تجاوز السقف: تدوير الفائض تلقائياً للشهر التالي، أم إيقاف واحتساب يدوي؟ | تدوير تلقائي (`OverBreachAction = AutoSpread`) مع تنبيه في تقرير الدورة. |
| 18 | «استقطاع راتب شهر» كعقوبة: هل يُنفَّذ دفعةً واحدة إن سمح السقف، أم يُقسَّط دائماً على حدٍّ أدنى من الأشهر؟ | تقسيط دائم على أقلّ عدد أشهر يحترم السقف. |
| 19 | تغليف الرواتب: وحدة ABP مستقلة compile‑time، أم plugin يُحمَّل وقت التشغيل؟ | ✅ **وحدة ABP مستقلة `modules/payroll`** خلف feature flag — الـ plugin وقت التشغيل مرفوض (لا سابقة، يصطدم بالبنية). موفّرات الأنظمة (`IPayrollRegimeProvider`) هي "الـ plugins" البرمجية داخلها. |
| 20 | أين تعيش `EmployeeCompensation` / `EmployeeLoan` / `DisciplinaryPenalty`؟ | في وحدة **`payroll`** (شؤون رواتب)، لا `hr`. HR يحتفظ بـ Employee/Attendance/Leave/Holiday فقط. |
| 21 | حدود إتاحة الرواتب: feature على مستوى المستأجر، أم الإصدار (edition)، أم كليهما؟ | feature `Payroll` قابل للتعيين على الإصدار والمستأجر معاً (نمط ABP القياسي). |

---

## 12. ملاحق — أمثلة حسابية

> ⚠️ **كل الأرقام افتراضية للتوضيح فقط** — تُستبدل بالقيم المعتمدة في Phase 0 وتصبح golden tests.

### 12.1 موظف حكومي — درجة 7 مرحلة 3، بكالوريوس، متزوج + 3 أطفال، مخصصات منصب رئيس شعبة

| البند | النوع | الأساس | المبلغ (د.ع) |
|---|---|---|---|
| الراتب الاسمي (درجة 7/مرحلة 3) | استحقاق | جدول السلّم | 620,000 |
| العلاوة السنوية المتراكمة | استحقاق | ثابت | 45,000 |
| مخصصات الشهادة (بكالوريوس) | استحقاق | ثابت | 45,000 |
| مخصصات المنصب (رئيس شعبة) | استحقاق | ثابت | 150,000 |
| مخصصات الزوجية | استحقاق (معفى ضريبياً) | ثابت | 30,000 |
| مخصصات الأطفال (3 × 10,000) | استحقاق (معفى ضريبياً) | ثابت | 30,000 |
| **الإجمالي (Gross)** | | | **920,000** |
| الوعاء التقاعدي | | الاسمي + العلاوة + الشهادة | 710,000 |
| التوقيفات التقاعدية — حصة الموظف | استقطاع | 10٪ × 710,000 | (71,000) |
| الوعاء الضريبي | | Gross − معفى (60,000) − حصة التقاعد | 789,000 |
| الإعفاء الضريبي الشهري (متزوج + أطفال) | | ثابت (توضيحي) | 625,000 |
| ضريبة الدخل | استقطاع | شرائح على (789,000 − 625,000) = 164,000 | (5,600) |
| قسط قرض إسكان | استقطاع | جدول السلفة | (100,000) |
| **صافي الراتب (Net)** | | 920,000 − 71,000 − 5,600 − 100,000 | **743,400** |
| حصة الدولة — تقاعد (15٪ × 710,000) | مساهمة رب العمل | | 106,500 |
| **كلفة صاحب العمل** | | 920,000 + 106,500 | **1,026,500** |

### 12.2 عامل قطاع خاص — أساسي + بدل سكن + نقل، متزوج + طفلان، 10 ساعات إضافية

| البند | النوع | الأساس | المبلغ (د.ع) |
|---|---|---|---|
| الأجر الأساسي | استحقاق | العقد | 900,000 |
| بدل سكن | استحقاق | العقد | 200,000 |
| بدل نقل | استحقاق (معفى ضمن حدّ) | العقد | 100,000 |
| العمل الإضافي (10 س × (900,000/192) × 1.5) | استحقاق | ساعات × معدل × 150٪ | 70,300 |
| **الإجمالي (Gross)** | | | **1,270,300** |
| وعاء الضمان الاجتماعي | | أساسي + سكن + إضافي (لا نقل) | 1,170,300 |
| الضمان — حصة العامل | استقطاع | 5٪ × 1,170,300 | (58,515) |
| الوعاء الضريبي | | Gross − نقل معفى (100,000) − حصة الضمان | 1,111,785 |
| الإعفاء الضريبي الشهري (متزوج + طفلان) | | ثابت (توضيحي) | 583,000 |
| ضريبة الدخل | استقطاع | شرائح على 528,785 | (21,900) |
| قسط قرض موظف (`EmployeeLoan`) | استقطاع | جدول الأقساط | (150,000) |
| **صافي الأجر (Net)** | | 1,270,300 − 58,515 − 21,900 − 150,000 | **1,039,885** |
| الضمان — حصة صاحب العمل (12٪ × 1,170,300) | مساهمة رب العمل | | 140,436 |
| **كلفة صاحب العمل** | | 1,270,300 + 140,436 | **1,410,736** |

### 12.3 القيد المحاسبي للمثال 12.2 (موظف واحد، مركز كلفة X)

| الطرف | الحساب | مدين | دائن |
|---|---|---|---|
| مدين | مصروف الرواتب والأجور | 1,270,300 | |
| مدين | مصروف حصة صاحب العمل — الضمان | 140,436 | |
| دائن | أمانات الضمان الاجتماعي (58,515 + 140,436) | | 198,951 |
| دائن | أمانات ضريبة الدخل | | 21,900 |
| دائن | قروض وسلف الموظفين المدينة (`EmployeeLoan`) | | 150,000 |
| دائن | رواتب مستحقة الدفع | | 1,039,885 |
| | **المجموع** | **1,410,736** | **1,410,736** |

عند الدفع (سند دفع من Finance): من ح/ رواتب مستحقة الدفع 1,039,885 ← إلى ح/ المصرف. وعند التوريد: من ح/ أمانات الضمان / الضريبة ← إلى ح/ المصرف.

### 12.4 الغياب والتأخير والعقوبة (توضيح منفصل — أجر أساسي 900,000، 26 يوم عمل)

| البند | الأساس | المبلغ (د.ع) |
|---|---|---|
| معدّل اليوم | 900,000 ÷ 26 | 34,615 |
| خصم يومَي غياب غير مبرَّر | 34,615 × 2 | (69,230) — يخفّض Gross |
| خصم تأخير (3 مرات، شريحة 16–30 د = نصف يوم للمرة) | (34,615 ÷ 2) × 3 | (51,923) — يخفّض Gross |
| عقوبة تأديبية «قطع 5 أيام راتب» (قرار DISC-2026-014) | 34,615 × 5 | (173,075) استقطاع بعد Gross |
| — لو كان صافي الشهر 800,000 والسقف 25٪ ⇒ الحدّ 200,000 | العقوبة 173,075 ضمن الحدّ ⇒ تُخصم كاملة هذا الشهر | |
| — لو كانت العقوبة «راتب شهر» (900,000) | تتجاوز 200,000 ⇒ تُقسَّط على 5 أشهر (180,000/شهر) وفق `AutoSpread` | |

---

## 13. مراجع

- **قوانين عراقية**: رواتب موظفي الدولة 22/2008؛ الخدمة المدنية 24/1960؛ **انضباط موظفي الدولة 14/1991** (العقوبات التأديبية)؛ التقاعد الموحّد 9/2014؛ ضريبة الدخل 113/1982 وتعديلاتها؛ العمل 37/2015 (الجزاءات، سجلّ الجزاءات، حدود الغرامة)؛ التقاعد والضمان الاجتماعي للعمال 39/1971 و18/2023؛ قرارات مجلس الوزراء بشأن الحد الأدنى للأجور والسلالم الخاصة.
  > **إلزامي في Phase 0**: تثبيت النسب والشرائح والإعفاءات والحدود من الجريدة الرسمية والتعليمات النافذة لسنة التطبيق — لا تُعتمد أرقام هذا المستند كما هي.
- **أنماط التصميم**: Odoo `hr_payroll` (Salary Structure / Salary Rules / Rule Parameters / Payslip Run / Contribution Registers)؛ SAP wage types + payroll schema + control record + retroactive accounting.
- **ملفات Enki ذات الصلة**:
  - [`Employee.cs`](../../../jasim_api/modules/hr/src/HR.Domain/Entities/Employees/Employee.cs)
  - [`AdvanceRequest.cs`](../../../jasim_api/modules/finance/src/Finance.Domain/Entities/Advances/EmployeeAdvances/AdvanceRequest.cs) — نمط دورة الصرف/التسوية الذي يحاكيه `EmployeeLoan` الجديد
  - [`IJournalEntryIntegrationAppService.cs`](../../../jasim_api/modules/core/src/Core.Application.Contracts/Integrations/IJournalEntryIntegrationAppService.cs)
  - [`FinanceJournalPostDto.cs`](../../../jasim_api/modules/finance/src/Finance.Application.Contracts/Entities/JournalEntries/Integration/FinanceJournalPostDto.cs)
  - [`SharedEnums.cs` (Core)](../../../jasim_api/modules/core/src/Core.Domain.Shared/Entities/SharedEnums.cs)
  - نمط التقارير: [`holiday-management-plan.md`](../holiday-management-plan.md) · [[report-per-report-folder-structure]]
