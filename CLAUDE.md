@AGENTS.md

# ENKI ERP — موديول الرواتب (Mockup)

موك أب تفاعلي (Clickable Prototype) لموديول **الرواتب** داخل نظام **ENKI ERP**. لا باك إند حقيقي ولا مصادقة حقيقية ولا حفظ دائم؛ كل البيانات وهمية مصدرها ملفات JSON محلية، وكل "حفظ" يحدّث حالة محلية (in-memory store) فقط. أي تكامل خارجي (HR، Finance) يُعرض كـ Placeholder تفاعلي.

**اقرأ أولاً قبل أي عمل:**
1. `WORKLOG.md` من البداية.
2. `docs/roadmap.md` (القرارات والترتيب والفجوات).
3. `docs/spec-payroll-<module>.md` للموديول الحالي، و`docs/prompts-*.md` للبرومت الحالي.
4. `docs/identity.md` للهوية والـ Shell، و`docs/payroll-study-and-implementation-plan.md` كمصدر المتطلبات الوحيد. **لا تخترع متطلبات**: الناقص/المتضارب يُسجَّل بـ WORKLOG ويُسأل عنه.
5. `docs/playbook-new-mock.md` للمنهجية.

## التقنيات
- **Next.js (App Router) + TypeScript** — النسخة فيها breaking changes، اقرأ `node_modules/next/dist/docs/` عند الشك (راجع `AGENTS.md`).
- **Tailwind CSS v4** — لا `tailwind.config`؛ التوكنز عبر CSS variables + `@theme inline` بـ `app/globals.css`.
- **shadcn/ui** (style `base-nova`، إضافة عبر `npx shadcn@latest add <component>`)، `next-themes`، `lucide-react`.

## هيكل المجلدات
```
app/
  page.tsx           # لوحة الموديولات
  (shell)/           # كل الصفحات اللي تحتاج Sidebar/Topbar
    payroll/         # موديول الرواتب — داخل (shell) لا جنبه
    dashboard/
  login/             # خارج (shell)
  api/               # Route Handlers لكل الـ Mock API
mock-data/           # JSON — مصدر الحقيقة الوحيد للبيانات الوهمية (payroll/ و hr/)
components/          # مكوّنات مشتركة فقط (ui/ = shadcn، shell/)
lib/                 # mock-api.ts, i18n/, navigation.ts, payroll/ (engine, store, types...)
docs/                # roadmap + spec-*.md + prompts-*.md
```
> مجلدات الموديولات داخل `app/(shell)/` — الـ `layout.tsx` بـ route group ما يلف إلا اللي بداخله.

## قواعد العمل الإلزامية
1. **إعادة استخدام المكوّنات**: كل موديول يستخدم `components/` المشتركة. تنويع مطلوب → وسّع المكوّن المشترك بـ props، لا تكرره. ممنوع مكوّنات UI عامة داخل `app/**`.
2. **البيانات الوهمية عبر API فقط**: JSON بـ `mock-data/` تُقرأ حصراً عبر `app/api/`. الصفحات تسوي `fetch` ولا تستورد JSON ولا تكتب arrays ثابتة داخل الكومبوننتات.
3. **نمط الشاشات الخمس لكل موديول**: لائحة → تفاصيل → إنشاء/تعديل → سجل حركات → مؤشرات صغيرة.
4. **Dark/Light + RTL/LTR تلقائياً**: ألوان بـ tokens دلالية فقط (`bg-card`, `text-muted-foreground`...) بدون hex مباشر بالمكوّنات، وخصائص منطقية (`ps-`/`start-`/`text-start`) بدل `pl-`/`left-`.
5. **WORKLOG.md**: قبل أي عمل اقرأه من البداية. بعد كل مهمة أضف سجلاً بالأسفل (Append-only، ممنوع تعديل/حذف القديم).
6. **بيانات واقعية ومترابطة**: أسماء وجهات وتواريخ وأرقام واقعية (مو Test1/Test2)، وكل كيان يشير للثاني بمعرّف (`employeeId`, `loanId`...).
7. **Commit**: **لا تسوي commit تلقائياً** — بآخر كل خطوة ذكّر المستخدم بالـ commit مع رسالة مقترحة بصيغة `feat(<module>): <وصف>` (أو `chore:`/`docs:`/`fix:`).

## خاص بالرواتب
- **`EmployeeReceivable` و`Finance.AdvanceRequest` خارج النطاق نهائياً** — كل ما يُسترَدّ من الراتب يمرّ عبر `EmployeeLoan` فقط (الدراسة 1 و8.4.1).
- **لا `if (government)` بالمحرك**: الفرق بين الحكومي والخاص = صفوف بيانات (Payroll Profile) + `IPayrollRegimeProvider`.
- **المحرك** (`lib/payroll/engine.ts`) دوال نقية وتنحسب فعلياً، ولازم يطابق الأمثلة الذهبية بالدراسة القسم 12 (مع ملاحظات G1–G3 بالـ roadmap).
- الأرقام القانونية (نسب/شرائح/إعفاءات) **توضيحية** — تُعرض بشارة تحذير.
- العملة: دينار عراقي (`IQD`)، عرض `MoneyCell`: فواصل آلاف + "د.ع".

## الـ Mock API (اصطلاحات)
- كل Route Handler يلفّ جسمه بـ `mockResponse(request, () => ...)` من `lib/mock-api.ts` (تأخير 300–600ms، تحويل الأخطاء لـ JSON). `throw new MockApiError(404, "...")` لإرجاع حالة محددة.
- للاختبار: أضف `?mockFail=1` لأي طلب لإجبار 500 (لفحص حالة الخطأ بالواجهة)، أو `?mockDelay=<ms>` لتغيير التأخير.
- البيانات **الطبيعية للتعديل** (قروض، دورات، قسائم…) تُقرأ وتُعدَّل عبر `lib/payroll/store.ts` (`collection` / `findById` / `insertItem` / `updateItem` / `removeItem` / `nextNumber`) — in-memory، تبقى طول عمر الـ dev server، و`POST /api/mock/reset` يرجّعها للـ JSON. ممنوع كتابة ملفات JSON من الكود.
- مسارات HR (تكامل Placeholder، قراءة فقط): `/api/hr/{employees,employees/[id],attendance,leave-requests,rewards-discipline,positions}` من `mock-data/hr/`.
- `GET /api/health` للفحص. صفحات `/dev/{tokens,locale,components}` مرجع بصري داخلي فقط (بيانات inline مسموحة هناك).

## القيود التقنية المعروفة
- لا تلف `Button` المشترك داخل `render`/`asChild` لـ Base UI (`DropdownMenuTrigger`, `Link`...) — استخدم عنصراً خاماً (`<button>`/`<Link>`) مع `buttonVariants` كـ className.
- شعار بنص أسود: ضعه دائماً داخل بطاقة `bg-white` ثابتة حتى يبقى مقروءاً بالوضع الغامق.
- `next-themes`: `enableSystem={false}` و`defaultTheme="light"`، و`suppressHydrationWarning` على `<html>`.
- `<html>` الافتراضي `lang="ar" dir="rtl"`؛ الخط يتبدّل بحسب اللغة عبر `--font-sans`.
- سكربت `dev` ينظّف `.next` قبل التشغيل (predev).
- تحقق بعد كل تغيير مرئي: `preview_start` ثم console/network ثم تجربة التفاعل ثم تبديل الثيم/اللغة ثم `npm run build`.
