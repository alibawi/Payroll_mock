# Spec — الموديول 3: السلف والقروض (Employee Loans)

> **المصدر**: الدراسة 1 (النطاق)، 2 (الفجوة 6)، 8.2 (كيان 14)، 8.4 (نموذج القيد)، **8.4.1** (تفاصيل السلف/القروض)، 8.5، 10 (Phase 2 + 5 + 6)، 11 (قرار 3).
> **حاسم**: `EmployeeLoan` هو **المصدر الوحيد** لأي مبلغ يُسترَدّ من راتب الموظف. **`EmployeeReceivable` (ذمم الموظفين) و`Finance.AdvanceRequest` (سلف النشاط الجاري) خارج النطاق نهائياً** — لا قراءة ولا تكامل ولا إشارة بالواجهة.

---

## 1. النطاق وصلته بالموديولات
- قرض بأقساط (`PersonalLoan`) أو سلفة راتب تُسدَّد كاملة براتب الشهر التالي (`SalaryAdvance`).
- دورة: طلب ← موافقة ← **صرف** (يرحّل قيداً) ← أقساط تُستقطع تلقائياً من الرواتب ← تسوية.
- يعتمد على: الموديول 2 (موظف له تعويض)، الموديول 1 (حسابات GL).
- يغذّي: الموديول 5 عبر `PayrollDeductionScheduleItem` (المستحق هذا الشهر). الترحيل يقفل القسط ويخفّض الرصيد، والعكس يعيد فتحه.

## 2. نموذج البيانات

### 2.1 `EmployeeLoan` (`payroll/loans.json`)
| الحقل | ملاحظات |
|---|---|
| `id`, `loanNo` | مثل `LN-2026-0007` |
| `employeeId` | |
| `loanType` | `PersonalLoan` \| `SalaryAdvance` |
| `loanDate`, `principal`, `currencyCode` | |
| `interestType` (`None`\|`Flat`), `interestRate?` | |
| `totalRepayable` | = الأصل + فائدة Flat (إن وُجدت) |
| `repaymentMethod` | `FullNextPayroll` (للسلفة) \| `Installments` |
| `installmentCount`, `installmentAmount` | السلفة: 1 |
| `firstDeductionPeriodId` | |
| `outstandingBalance` | |
| `status` | `Draft, PendingApproval, Approved, Disbursed, Active, Settled, Cancelled` |
| `approvedBy?/At?`, `rejectedBy?/At?/Reason?` | تتبّع الموافقة |
| `guarantorEmployeeId?`, `reason`, `costCenterId?`, `comments?` | |
| `loanReceivableAccountCode`, `disbursementAccountCode` | أصل «قروض وسلف الموظفين المدينة» / نقد أو بنك |
| `journalEntryId?`, `journalRef?` | القيد المرحَّل عند الصرف |

### 2.2 `EmployeeLoanInstallment`
`id, loanId, seqNo, duePeriodId, dueDate, amount, deductedAmount, status (Pending | Deducted | Waived | Deferred), payslipId?, deductedOn?`.

## 3. دورة حياة الحالات (State Machine)

```
Draft ──submit──▶ PendingApproval ──approve──▶ Approved ──disburse──▶ Disbursed ──(أول استقطاع)──▶ Active ──(رصيد=0)──▶ Settled
   │                    │ reject → Draft (مع سبب)                                              ▲
   └─cancel─▶ Cancelled ◀────cancel─────┘  (وكذلك من Approved)                                 │
                                      early-settle (من Disbursed/Active) ──────────────────────┘
```
| الحالة | الأزرار المتاحة | ملاحظات |
|---|---|---|
| Draft | تعديل، إرسال للاعتماد، إلغاء | |
| PendingApproval | اعتماد، رفض (يرجع Draft) | صلاحية `approve` |
| Approved | صرف، إلغاء | **يُولَّد جدول الأقساط عند الاعتماد** (8.4.1) |
| Disbursed | تسوية مبكرة | صرف = يرحّل القيد |
| Active | تسوية مبكرة، تأجيل قسط (Deferred)، إعفاء قسط (Waived) | **قرار موك أب** لأن الحالتين بالقسط مذكورتان بالكيان |
| Settled / Cancelled | عرض فقط | |

> **G6 (roadmap)**: وقت الانتقال إلى `Active` غير محدد بالدراسة؛ الافتراض: بعد أول استقطاع. السلفة (قسط واحد) تنتقل `Disbursed → Settled` مباشرة عند ترحيل الراتب.

## 4. قواعد العمل
| # | القاعدة | المصدر |
|---|---|---|
| L-1 | للموظف تعويض نافذ (وإلا لا يُقبل الطلب) | مشتق (استقطاع من الراتب) |
| L-2 | القرض: `installmentAmount = (principal + فائدة اختيارية) ÷ installmentCount` والقسط الأخير يمتص التقريب | 8.4.1 |
| L-3 | السلفة: قسط واحد بكامل المبلغ بالفترة التالية (`FullNextPayroll`) | 8.4.1 |
| L-4 | يُولَّد الجدول عند `Approve` | 8.4.1 |
| L-5 | الصرف يرحّل: مدين `قروض وسلف الموظفين المدينة` / دائن `النقد أو المصرف`، نوع الوثيقة `EMPLOAN`، ويربط `journalRef` | 8.4.1 / 8.4 |
| L-6 | الاستقطاع: الأقساط `Pending` المستحقة بفترة الدورة تُلتقط وتظهر بالقسيمة كبند استقطاع | 8.4.1 |
| L-7 | عند `Post` الدورة: القسط `→ Deducted` (مع `payslipId`)، `outstandingBalance -= القسط`، سطر قيد دائن على حساب القرض | 8.4.1 |
| L-8 | `outstandingBalance = 0` ⇒ `Settled` | 8.4.1 |
| L-9 | عكس الدورة: القسط `→ Pending` ويعود الرصيد | 8.4.1 / 8.4 |
| L-10 | التسوية المبكرة: تقفل الأقساط المتبقية دفعة واحدة (مقابل نقد/راتب — **قرار مصدر السداد أثناء التنفيذ** حسب الدراسة؛ الموك أب يوفّر الخيارين: نقد بقيد Dr نقد/Cr قرض، أو من راتب الشهر) | 8.4.1 |
| L-11 | سقف الاستقطاع الشهري (عقوبات + قضائي + أقساط) ≤ نسبة من الأجر؛ الفائض يُرحَّل للفترة التالية (AutoSpread) | 3.4 / 8.3 خطوة 6.5 |
| L-12 | لا يُسمح بسلفة جديدة لموظف عنده سلفة غير مسددة **(قرار موك أب)** | — |
| L-13 | معاينة سقف قبل الاعتماد: تحذير إذا القسط يتجاوز السقف الشهري | مشتق من L-11 |

## 5. الصلاحيات
Subject `payroll.loan`، أفعال: `view/create/update/delete/approve/disburse`.
| الدور | الصلاحية |
|---|---|
| hrManager | view/create/update/approve/**cancel** |
| payrollOfficer | view/create/update |
| financeAccountant | view + **disburse** |
| deptHead | create (طلب لموظف من قسمه)، view قسمه |
| employee | طلب سلفة/قرض لنفسه + عرض سلفه (`my-loans`) |

## 6. مؤشرات (KPIs)
إجمالي الأرصدة القائمة · عدد القروض النشطة · طلبات بانتظار الاعتماد · الأقساط المستحقة هذا الشهر (مبلغ + عدد) · متوسط القسط/الراتب · قروض متأخرة/مؤجّلة.

## 7. التكاملات (Placeholders)
- **Finance / `IJournalEntryIntegrationAppService`**: الصرف **يعرض معاينة القيد** (Modal `JournalPreview`) ويخزّن `journalRef` وهمي بصيغة `JV-EMPLOAN-####` — بدون ترحيل حقيقي.
- **HR**: لقطة الموظف فقط.
- `DocumentType`: `EMPLOAN` ترقيم تسلسلي.

## 8. قائمة الشاشات الكاملة
| # | الشاشة | المسار | ملاحظات |
|---|---|---|---|
| 1 | لائحة السلف والقروض | `/payroll/loans` | تبويبات: الكل، بانتظار الاعتماد، معتمد/جاهز للصرف، نشط، مسدد، ملغى؛ فلاتر: النوع، الموظف، الفترة؛ أعمدة: الرقم، الموظف، النوع، الأصل، الرصيد، القسط، الحالة |
| 2 | تفاصيل القرض | `/payroll/loans/[id]` | رأس + بطاقة الرصيد + **جدول الأقساط** (حالة كل قسط + رابط القسيمة) + Timeline + Audit + تعليقات + رابط الموظف/القسائم/القيد |
| 3 | إنشاء/تعديل طلب | `/payroll/loans/new` | فورم: الموظف (EmployeeSelect)، النوع، المبلغ، عدد الأقساط، فائدة، أول فترة استقطاع، الكفيل، السبب، المرفقات + **معاينة جدول الأقساط الحيّة** |
| 4 | إجراءات الحالة | أزرار بالتفاصيل | اعتماد/رفض(سبب)/صرف(معاينة القيد)/إلغاء/تسوية مبكرة/تأجيل/إعفاء |
| 5 | مودال الصرف + معاينة القيد | Modal | `JournalPreview` |
| 6 | مودال التسوية المبكرة | Modal | اختيار مصدر السداد (نقد/راتب) + المبلغ المتبقي |
| 7 | سجل حركات | تبويب | Audit Trail |
| 8 | مؤشرات | أعلى اللائحة | KPIs |
| 9 | صلاحيات | `/payroll/permissions` | صفوف `payroll.loan` |
| 10 | خدمة ذاتية: سلفي | `/payroll/my-loans` | يبنى بالمرحلة 7 (يعرض قروض الموظف ويسمح بطلب جديد) |

## 9. ترتيب الأوامر (للبناء)
1. راوتات + Sidebar.
2. mock-data (`loans`, `loan-installments`, `loan-activity-log`) واقعية (قرض إسكان 100,000/قسط كمثال 12.1، قرض 150,000/قسط مثال 12.2، سلف راتب، قروض مسددة/ملغاة/بانتظار) + API + `lib/payroll/loans.ts` (مولّد الجدول).
3. لائحة القروض.
4. تفاصيل + جدول الأقساط + Timeline.
5. State machine + قواعد L-1..L-13 (الأزرار حسب الحالة، Audit على كل إجراء).
6. فورم الطلب + المعاينة الحيّة + مودالات الصرف/التسوية.
7. تأجيل/إعفاء قسط + طلب دفعة الاعتماد.
8. صلاحيات.
9. KPIs.
10. اختبار تدفق كامل: طلب قرض ← اعتماد ← صرف (معاينة القيد) ← ظهور الأقساط ← تبديل ثيم/لغة.
