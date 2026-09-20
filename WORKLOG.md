<div dir="rtl">

# WORKLOG

قبل أي عمل بهذا المشروع: اقرأ هذا الملف كامل من البداية لتعرف وين وصلنا بالضبط وشنو الخطوة الجاية المقترحة.

بعد إنهاء أي مهمة أو برومت (حتى لو جزئي، أو توقف بمنتصفه، أو فيه مشكلة لم تُحل): أضف سجل جديد بأسفل هذا الملف يتضمن:
- التاريخ والوقت
- الموديول/الشاشة اللي اشتغلت عليها
- شنو تم إنجازه بالضبط (بدقة، مو وصف عام)
- أي قرار تصميمي مهم اتخذته أثناء العمل (خصوصاً إذا خالف أو وسّع شي مذكور بالـSpec أو الرود ماب، مع السبب)
- أي مشكلة واجهتك أو شي أجّلته لاحقاً
- شنو تحققت منه فعلياً (بالمتصفح، console/network، build)
- الخطوة الجاية المقترحة تحديداً

لا تعدّل أو تحذف السجلات القديمة أبداً — فقط أضف سجل جديد بالأسفل (Append-only).

**ملاحظة عمل**: لا تسوي `git commit` تلقائياً؛ بآخر كل خطوة ذكّر المستخدم بالـcommit مع رسالة مقترحة.

---

## 2026-09-20

- **الموديول**: التخطيط (المرحلة أ)
- **المُنجز**: قرأت الدراسة `docs/payroll-study-and-implementation-plan.md` والـ playbook، ونسخت اللقطة المرجعية إلى `docs/assets/enki-erp-home.png`. كتبت `docs/identity.md` (الهوية وهيكل الـ Shell حسب اللقطة)، `docs/roadmap.md`، ستة specs (`spec-payroll-{config,compensation,loans,penalties,runs,reports}.md`) وثمانية ملفات برومتات (`prompts-phase0.md`, `prompts-payroll-{config,compensation,loans,penalties,runs,reports,polish}.md`). تم الـ commit `aad4578`.
- **قرارات تصميمية مهمة**: الموديول واحد (`payroll`) بستة أقسام فرعية؛ رتّبنا القروض والعقوبات **قبل** الدورات (عكس ترتيب الدراسة قسم 10) لأن الدورة تستهلكها؛ المحرك (`lib/payroll/engine.ts`) يُحسب فعلياً بينما التكاملات (HR/Finance) Placeholders؛ الأدوار الوهمية خمسة بدل أربعة (hrManager, payrollOfficer, financeAccountant, deptHead, employee).
- **فجوات/متضارب بالمصدر (سُجّلت بـ roadmap قسم 8)**: G1 شرائح الضريبة غير محددة؛ G2 مثالا 12.1 و12.2 غير متسقين ضريبياً (5,600 على 164,000 مقابل 21,900 على 528,785 — الثاني أقل من الحد الأدنى الممكن بنفس الشرائح)؛ G3 تقريب الإضافي (70,312.5 معروض 70,300 مقابل قرار التقريب لأقرب 250)؛ G4–G9 حالات وانتقالات غير محددة.
- **التحقق الفعلي**: لا كود بعد؛ راجعت حسابات أمثلة الدراسة 12.1–12.4 يدوياً.
- **الخطوة الجاية**: المرحلة 0 — برومت 0.1.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.1 تهيئة المشروع و0.2 WORKLOG
- **المُنجز**:
  - 0.1: مشروع Next.js **16.2.12** + React 19.2.4 + TypeScript + Tailwind v4 + ESLint (App Router، بدون `src/`، alias `@/*`) بجذر `C:\repos\Payroll_mock`. اسم الحزمة `payroll-mock` (npm يرفض الأحرف الكبيرة بـ`Payroll_mock` فأنشأت القالب بمجلد مؤقت ونسخته). ثبّتُّ نفس مكتبات Enki-Workspace-Mock: `@base-ui/react`, `shadcn`, `next-themes`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`. نسخت `components.json` (style `base-nova`) و`lib/utils.ts` من Enki. أضفت سكربت `predev` ينظّف `.next`. أنشأت الهيكل: `app/(shell)/payroll/`, `app/login/`, `app/api/`, `components/{ui,shell}/`, `mock-data/{payroll,hr}/`, `lib/{payroll,i18n}/` (بملفات `.gitkeep`). استبدلت صفحة الـ home بـ placeholder، وحذفت SVGs القالب من `public/`. كتبت `CLAUDE.md` بالقواعد الإلزامية السبع + قيود الرواتب + القيود التقنية المعروفة.
  - 0.2: هذا الملف، بالقاعدة الثابتة أعلاه.
- **قرارات تصميمية مهمة**: أبقيت `AGENTS.md` من القالب (يحذّر إن Next.js 16 فيه breaking changes ويطلب قراءة `node_modules/next/dist/docs/` قبل الكتابة) وربطته من `CLAUDE.md`؛ القاعدة 7 بـ `CLAUDE.md` عُدّلت عن الـ playbook: **لا commit تلقائي**، تذكير للمستخدم بدل ذلك (طلب المستخدم).
- **مشاكل/مؤجّل**: `npm install` أبلغ عن 3 ثغرات (2 high, 1 critical) بالتبعيات — لم تُعالَج (ما أسويها `audit fix --force` بدون طلب)؛ تُراجع قبل التسليم النهائي.
- **التحقق الفعلي**: `npm run build` نجح (مسارا `/` و`/_not-found` ثابتان). لا واجهة بعد للتحقق بالمتصفح.
- **الخطوة الجاية**: 0.3 — Design Tokens (ألوان الهوية، `bg-brand-gradient`، favicon) بنسخ `globals.css` و`public/brand/*` من Enki-Workspace-Mock.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.3 Design Tokens
- **المُنجز**: نسخت حرفياً من Enki-Workspace-Mock: `app/globals.css` (Primary `#4F41F8`، Accent `#3ED7FF`، `--secondary-orange` `#FFA630`، `--secondary-green` `#397367`، `--gradient-brand`، `--gradient-shell-wash`، سلّم الوضع الغامق `#0B0F19`/`#121729`/`#232B40`، `@utility bg-brand-gradient` و`bg-shell-wash` و`scrollbar-none`)، و`public/brand/*` (6 شعارات)، و`app/icon.png` (favicon) وحذفت `app/favicon.ico` الافتراضي لتفادي التعارض. أضفت **tokens ألوان بطاقات لوحة الموديولات** (`identity.md` 2.3): 15 لوناً (orange, mint, yellow, sky, slate, pink, blue, amber, teal, violet, lime, indigo, cyan, red, **fuchsia = الرواتب**) لكل واحد `--tile-<name>` (لون الأيقونة) و`--tile-<name>-bg` (خلفية ناعمة بـ `color-mix` 14–16%)، مسجّلة بـ `@theme inline` فتتاح كـ `bg-tile-fuchsia-bg text-tile-fuchsia`. بالوضع الغامق أفتحت ألوان الأيقونات للتباين وبقيت الخلفيات مشتقة. أضفت صفحة داخلية `/dev/tokens` (ألوان + بطاقات + الشعارات) للتحقق البصري، و`.claude/launch.json` لتشغيل الـ dev server.
- **قرارات تصميمية مهمة**: (1) اعتمدت `fuchsia` (`#C026D3`) للرواتب حسب افتراض `identity.md` — لم يردّ المستخدم على السؤال بعد، ويتغيّر بسطر واحد. (2) ألوان البطاقات الأخرى (orange…red) تقديرية من اللقطة وليست مأخوذة من كود ENKI ERP الحقيقي؛ تُعدَّل إذا توفّرت القيم الأصلية. (3) `/dev/tokens` صفحة مطوّر خارج `(shell)`، تبقى كمرجع.
- **مشاكل/مؤجّل**: الخطوط (Cairo/Geist) و`lang/dir` على `<html>` والـ metadata ما زالت افتراضية القالب (تُعالَج بـ 0.4/0.5)، لذلك النص بالصفحة يظهر بخط serif مؤقتاً.
- **التحقق الفعلي**: بالمتصفح (dev server): قيم المتغيرات بالوضعين صحيحة (`--primary` `#4f41f8`، `--accent` `#3ed7ff`، الأخضر `#397367`→`#4fae96`، fuchsia `#c026d3`→`#e879f9`)، وخلفية الغامق `rgb(11,15,25)`، و`bg-brand-gradient` يطبّق التدرّج، و`/icon.png` و`/brand/*` ترجع 200 وتنعرض، وبطاقات الألوان الـ15 تظهر بالوضعين، وconsole بلا أخطاء. `npm run build` و`eslint` نجحا بدون تحذيرات.
- **الخطوة الجاية**: 0.4 — Dark/Light (`next-themes`، `defaultTheme="light"`، `enableSystem={false}`، `suppressHydrationWarning`)، وبعدها 0.5 اللغتان والخطوط.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.4 Dark/Light
- **المُنجز**: أضفت `components/theme-provider.tsx` (wrapper خفيف حول `ThemeProvider` من next-themes) ولففته حول الـ children بـ `app/layout.tsx` بـ `attribute="class"` و`defaultTheme="light"` و`enableSystem={false}`، مع `suppressHydrationWarning` على `<html>`. سلّم الوضع الغامق (`.dark` بـ `globals.css`) جاهز من 0.3. صلّحت تحذير أبعاد الصورة بصفحة `/dev/tokens` (`logo-main.png` مربع 2000×2000؛ صار `width/height` 48 مع `style={{ width: "auto" }}`).
- **قرارات تصميمية مهمة**: `enableSystem={false}` عمداً حتى يبقى الافتراضي فاتحاً بغض النظر عن نظام الزائر. لا زر تبديل بعد (يجي مع الـ Topbar بـ 0.6)؛ `useTheme` جاهز للاستخدام مباشرة. `<html lang="en">` (قيمة القالب) لسا ما تغيّرت — تصير `lang="ar" dir="rtl"` بـ 0.5 مع الخطوط.
- **التحقق الفعلي**: بالمتصفح: أول زيارة بلا `localStorage` ← كلاس `light` وخلفية بيضاء؛ بعد `localStorage.theme='dark'` وإعادة تحميل ← كلاس `dark`، `color-scheme: dark`، وخلفية `rgb(11,15,25)` بدون وميض؛ الرجوع لـ `light` يشتغل. لا تحذيرات hydration بالـ console. تحذيرات preload لخط Geist وأخطاء WebSocket الخاصة بالـ HMR ظهرت فقط بسبب إيقاف/إعادة تشغيل الـ dev server وتحذيرات الخط الافتراضي (تختفي بتغيير الخطوط بـ 0.5). `npm run build` و`eslint` نجحا.
- **الخطوة الجاية**: 0.5 — `LocaleProvider` (ar/en، `dir` و`lang` على html) + `lib/i18n/labels.ts` (اسم الموديول، عناصر عامة، الأدوار الخمسة) + خطوط Cairo/Geist.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.5 لغتان
- **المُنجز**:
  - `components/locale-provider.tsx`: `LocaleProvider` + `useLocale()` يرجّع `{ locale, dir, setLocale, t }` (`t(label)` يختار النص من `{ar,en}` لتقليل التكرار). الحفظ بـ `localStorage("locale")`، وتطبيق `dir`/`lang` على `<html>`. الافتراضي `ar`.
  - `lib/i18n/labels.ts`: `appLabels` (الاسم، اسم الشركة الوهمي، ترحيب لوحة الموديولات…)، `moduleLabels` (16 موديول: الرواتب + 15 موديول ديكور من لقطة ENKI ERP)، `moduleCardLabels` (عنوان ووصف كل بطاقة بلوحة الموديولات، وصف الرواتب «إدارة الرواتب والاستقطاعات والسلف وقسائم الدفع»)، `roleLabels` (الأدوار الخمسة: `hrManager, payrollOfficer, financeAccountant, deptHead, employee`)، `commonLabels` (عناصر عامة بينها `currencySymbol` = «د.ع»/IQD).
  - `app/layout.tsx`: خطوط **Cairo** (عربي، `--font-arabic`) و**Geist** (إنكليزي)، و`<html lang="ar" dir="rtl">` افتراضياً، و`LocaleProvider` داخل `ThemeProvider`، وmetadata «ENKI ERP — الرواتب».
  - `app/dev/locale/page.tsx`: صفحة مطوّر (خارج shell) بمبدّل لغة مؤقت للتحقق من النصوص والخطوط والاتجاه.
- **قرارات تصميمية مهمة**: (1) بدل نسخ `LocaleProvider` من Enki حرفياً (كان يستدعي `setState` داخل `useEffect` ويفشل قاعدة `react-hooks/set-state-in-effect` بـ eslint) استخدمت **`useSyncExternalStore`** على مخزن صغير فوق `localStorage` مع fallback بالذاكرة إن كان التخزين غير متاح — الـ render الأول (server/hydration) يبقى على `ar` ثم ينتقل للمخزّن بدون hydration mismatch. (2) أسماء أدوار الرواتب الخمسة بدل أدوار Enki الأربعة (رود ماب قسم 4). (3) أوصاف بطاقات الموديولات الديكورية قُرئت من اللقطة وقد يختلف بعضها حرفياً عن ENKI ERP الأصلي (بطاقة «أمان» و«نقاط البيع» خصوصاً).
- **مشاكل/مؤجّل**: عند فتح الموقع والمخزّن `en` يظهر أول إطار بالعربي لحظياً (بسبب استخدام `ar` كقيمة السيرفر) — مقبول لأن الافتراضي عربي؛ يمكن لاحقاً تمرير اللغة عبر cookie لو انزعجنا. ملفات تسميات الموديولات الفرعية (`payroll-labels.ts`) تُنشأ ببرومتات الموديولات.
- **التحقق الفعلي**: بالمتصفح: أول زيارة ← `ar`/`rtl` وخط Cairo؛ زر English ← `en`/`ltr` وخط Geist ونص الترحيب الإنكليزي؛ إعادة التحميل تحافظ على الاختيار ثم يرجع الافتراضي بعد حذف المفتاح؛ الوضع الغامق يشتغل مع الاتجاهين؛ لا أخطاء hydration/console (أخطاء WebSocket الخاصة بالـ HMR كانت من إعادة تشغيل الـ dev server السابق فقط). `npm run build` و`eslint` نجحا.
- **الخطوة الجاية**: 0.6 — الـ Shell حسب لقطة ENKI ERP (Sidebar، Topbar، Breadcrumbs، ComingSoon، لوحة الموديولات) — أكبر خطوة بالمرحلة 0 وتحتاج مقارنة بصرية مع اللقطة.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.6 الـ Shell (ENKI ERP)
- **المُنجز**:
  - **Sidebar** (`components/shell/sidebar.tsx`): شريط ملتصق بالحافة (يمين بالعربي/يسار بالإنكليزي) عرض 256px، ينطوي لـ rail أيقونات (68px) مع tooltips ويحفظ الحالة (`lib/use-persisted-boolean.ts`). أعلاه شعار ENKI ERP + زر الطي؛ قائمة 16 موديول بأيقونة + اسم + Chevron (الرواتب فقط له أقسام فرعية مجمّعة بعناوين: مرجعيات/الموظفون/الدورات/التقارير/خدمتي/الإدارة، ويفتح تلقائياً عند التواجد داخله)؛ أسفله الإعدادات + اللغة (تبديل ar/en) + الإشعارات (dropdown فارغ).
  - **Topbar**: اسم الشركة الوهمي، زر `+` (قائمة إنشاء سريع لـ 4 شاشات رواتب)، بحث عام بشارة `K⌘` (Ctrl/⌘+K يركّز الحقل؛ النتائج بالمرحلة 7)، مفتاح الثيم (شمس/قمر بدون mount-check عبر `dark:hidden`)، وكتلة المستخدم (User/Username + أفاتار بنقطة خضراء) — **placeholder** حتى 0.7.
  - **QuickAccess** (شريط وحدات أفقي قابل للتمرير)، **Breadcrumbs** (بيت + مسار من `lib/navigation.ts`)، **ComingSoon**.
  - **الصفحة الرئيسية `/`** (`app/(shell)/page.tsx`): «مرحباً بك في نظام إنكي» + شبكة بطاقات (`ModuleCard`): أيقونة بمربع ملوّن + شارة `Ctrl X` + ↗ عند الـ hover + لون الموديول عند الـ hover. بطاقة الرواتب بعد الموارد البشرية.
  - `lib/navigation.ts` (16 موديول + أقسام الرواتب الفرعية + `resolveCrumbLabel`)، `lib/tile-styles.ts`، `lib/i18n/payroll-labels.ts`، `BrandMark`، وutility `bg-launcher-wash`؛ نسخت `components/ui/*` (shadcn) من Enki.
  - **الراوتات**: `app/(shell)/[module]` (15 موديول ديكور بـ `generateStaticParams` + `dynamicParams=false` ← 404 لغيرها)، و`app/(shell)/payroll/[[...slug]]` catch-all يعرض ComingSoon لأي شاشة رواتب لم تُبنَ بعد (الراوتات الفعلية بالموديولات تأخذ الأولوية عليه تلقائياً).
- **قرارات تصميمية مهمة**: (1) الصفحة الرئيسية داخل `(shell)` لأن اللقطة تُظهر الـ Sidebar/Topbar عليها. (2) الـ Sidebar `bg-card` وليس `bg-sidebar` (المتغير الافتراضي رمادي محايد ما يناسب سلّم الغامق الكحلي). (3) شعار الـ Sidebar = قصّ الأيقونة الملوّنة من `logo-main.png` عبر CSS background (بطاقة `bg-white` ثابتة)، وهو ملوّن بتدرّج الهوية بينما اللقطة الأصلية بخط أسود؛ `logo-icon.png` باهت جداً فما استخدمته. (4) اختصارات `Ctrl+X` على البطاقات **بصرية فقط** لأنها تتعارض مع اختصارات المتصفح (Ctrl+P/S/…)؛ الوحيد الفعّال Ctrl/⌘+K للبحث. (5) لا drawer للموبايل — الـ Shell مخصّص للديسكتوب (playbook ما يطلبه). (6) استخدمت `inline-end` للـ tooltip لتنقلب تلقائياً مع الاتجاه. (7) استبدلت `let`-accumulator بالـ breadcrumbs بحساب مباشر لأن eslint (`react-hooks/immutability`) يمنعه، وسمّيت متغيراً `moduleItem` بدل `module` (قاعدة Next).
- **مشاكل/مؤجّل**: (1) رابط «الإعدادات» يودّي لـ `/administration` (ComingSoon). (2) الإشعارات dropdown فارغ (المرحلة 7). (3) أخطاء WebSocket الخاصة بالـ HMR تظهر بالـ console داخل معاينة الـ Browser pane فقط (متعلقة بالـ dev server/البروكسي وليس بالتطبيق) ولا تظهر بالـ build. (4) بطاقة/وصف «أمان» و«نقاط البيع» تقريبيان من اللقطة (من 0.5).
- **التحقق الفعلي**: بالمتصفح على 1440×900 قارنت مع `docs/assets/enki-erp-home.png`: تخطيط الـ Sidebar واليمين/اليسار، الـ Topbar، شريط Quick Access، شبكة البطاقات وشارات الاختصار متطابقة بالشكل العام. اختبرت: توسيع/طي الـ Sidebar (256↔68px ويُحفظ)، تبديل الثيم (`dark` + الكحلي يطبّق)، تبديل اللغة (`en/ltr` ويقلب الـ Sidebar لليسار مع Geist)، فتح قائمة `+` والانتقال لـ `/payroll/loans/new`، أقسام الرواتب الفرعية وإبراز الصفحة الحالية، breadcrumbs، ومسارات `/shipping` (200) و`/payroll` (200) و`/foo` (404). لا تحذيرات hydration ولا «expected a native button». `npm run build` و`eslint` نجحا (21 صفحة).
- **الخطوة الجاية**: 0.7 — `/login` (شعار داخل بطاقة `bg-white`) + `RoleProvider` + `RoleSwitcher` بالأدوار الخمسة (يستبدل كتلة User/Username المؤقتة) بدون route guarding.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.7 Mock Auth
- **المُنجز**:
  - `components/role-provider.tsx`: `RoleProvider` + `useRole()` يرجّع `{ role, setRole, clearRole }`، `Role = keyof typeof roleLabels` (الأدوار الخمسة: `hrManager, payrollOfficer, financeAccountant, deptHead, employee`) و`isRole()`؛ التخزين بـ `localStorage("role")`. مغلّف بـ `app/layout.tsx` داخل `LocaleProvider`.
  - `components/shell/role-switcher.tsx`: كتلة المستخدم بالـ Topbar (أفاتار بتدرّج الهوية + نقطة خضراء + اسم الدور + «تبديل الدور») تفتح قائمة radio بالأدوار الخمسة + «تسجيل الخروج» (يمسح الدور ويودّي `/login`). بلا دور يظهر زر «تسجيل الدخول». استبدل الـ placeholder (User/Username) من 0.6.
  - `app/login/page.tsx` (خارج `(shell)`): بطاقة بشعار ENKI داخل مربع `bg-white` ثابت + اختيار الدور (5 أزرار بأيقونة ووصف سطر واحد لصلاحياته) ← يحفظ الدور ويودّي `/`؛ أعلاه مفتاحا اللغة والثيم لأن الصفحة خارج الـ Shell؛ تنبيه «نسخة تجريبية — لا توجد مصادقة حقيقية».
  - `lib/use-persisted-string.ts` (مخزن عام فوق `localStorage` بـ `useSyncExternalStore`) وأعدت بناء `usePersistedBoolean` عليه؛ `labels.ts`: `roleDescriptions` و`loginLabels`.
- **قرارات تصميمية مهمة**: (1) **بدون route guarding** (حسب الـ playbook): الدخول مباشرة لأي صفحة مسموح، والدور يبقى `null` حتى يختار أحد على `/login`. طبقة الصلاحيات (الموديول 1 خطوة 1.10) لازم تعالج `role === null` — **المقترح**: تعامله كأقل صلاحية (view فقط) أو تعرض دعوة لتسجيل الدخول؛ تُحسم وقتها. (2) بدل أسماء مستخدمين وهمية (`mockUsers.json`) عرضت اسم الدور فقط، لأن ربط الأدوار بموظفين حقيقيين يحتاج بيانات HR (تنبني بـ 0.9 وتُربط بالموديول 2) وقاعدة CLAUDE.md #2 تمنع hardcode. (3) الدخول يودّي `/` (لوحة الموديولات) لا `/dashboard` لأن الأخير يُبنى بالمرحلة 7. (4) `DropdownMenuLabel` من shadcn يحتاج Group context بـ Base UI فاستخدمت عنوان `<p>` عادي خارج الـ RadioGroup.
- **مشاكل/مؤجّل**: (1) أثناء التحقق لقيت عملية `node` قديمة (PID 12004، dev server لهذا المشروع) شاغلة المنفذ 3000 وصارت ترجع 500 بعد ما مسحت `.next` — أنهيتها وأعدت تشغيل الـ dev server؛ **إذا كنت تشغّل `npm run dev` بترمنال خارجي أعد تشغيله**. (2) واجهة موظف (`/payroll/my-payslips`) ما زالت ComingSoon — تُبنى بالمرحلة 7.
- **التحقق الفعلي**: بالمتصفح: `/login` بالعربي/الإنكليزي والفاتح/الغامق (الشعار مقروء بالوضعين)؛ اختيار «مسؤول الرواتب» ← redirect إلى `/` و`role=payrollOfficer` مخزّن والـ Topbar يعرض «Payroll Officer — Switch Role»؛ فتح القائمة تعرض الأدوار الخمسة (المحدد بعلامة ✓) + «Log out»؛ التبديل إلى Employee يحدّث الـ Topbar فوراً؛ إعادة تحميل الصفحة تحافظ على الدور؛ «تسجيل الخروج» ← `/login` و`role` يُمسح؛ بلا دور يظهر زر «تسجيل الدخول». لا تحذيرات hydration ولا «expected a native button». `npm run build` و`eslint` نجحا (`/login` ضمن المسارات).
- **الخطوة الجاية**: 0.8 — مكتبة المكوّنات المشتركة (DataTable, StatusBadge, KPICard, Modal, Timeline, FormField, FilterSelect, SearchableSelect, EmployeeSelect, ChipListEditor, المرفقات، ModuleScreensGrid + `MoneyCell`, `MoneyInput`, `WorkflowActionBar`, `JournalPreview`, `PayslipLineTable`) مع صفحة `/dev/components`.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.8 مكتبة المكوّنات
- **المُنجز** (كلها بـ `components/`، وصفحة العرض `/dev/components`):
  - **مستنسخة/مكيّفة من Enki**: `StatusBadge`, `KPICard` (trend + progress + tone)، `Modal`, `Timeline`, `FormField`, `FilterSelect` (يصدّر `FILTER_ALL`)، `SearchableSelect`, `EmployeeSelect`, `ChipListEditor` (+`SingleFilePicker`, `MultiSelectChips`)، `ModuleScreensGrid`.
  - **`DataTable` موسّع**: بحث + slot للفلاتر + ترتيب بالعمود (`sortValue`) + ترقيم + حالات `loading`/`error` (زر إعادة محاولة)/فارغ + `footer` لصف المجاميع + `rowClassName`.
  - **جديدة**: `AttachmentUploader`/`AttachmentList` (سحب وإفلات + رفع وهمي ~0.8 ثانية، الملفات ما تنرسل)، `WorkflowActionBar` (أزرار حسب الدور `roles` + `disabled/disabledReason` + مودال تأكيد `confirm`)، وبمجلد `components/payroll/`: `MoneyCell`، `MoneyInput`، `JournalPreview` (جدول مدين/دائن + مجاميع + شارة «متوازن/غير متوازن» + فرق)، `PayslipLineTable` (استحقاقات/استقطاعات/مساهمات بمجاميع فرعية + ملخص Gross/Net/Employer cost).
  - `lib/payroll/format.ts` (`formatMoney/formatNumber/formatPercent/formatDate/parseMoney`)، `lib/payroll/types.ts` (نوع البند/سطر القسيمة/سطر القيد فقط — الباقي يُضاف مع كل موديول)، `lib/types/hr.ts` (`Employee`)، وتسميات `componentLabels` (عام) و`payslipLabels`/`journalLabels`/`payslipSourceLabels` (رواتب).
- **قرارات تصميمية مهمة**: (1) **`external-share-modal` لم يُنسخ** — مودال المشاركة/الإحالة الخاص بـ DMS؛ الرواتب ما فيها إحالات/مشاركة خارجية، فلا حاجة له (playbook: «إذا النظام فيه إحالات»). (2) الأرقام المالية دائماً **أرقام لاتينية بفواصل آلاف** (مثل لقطة ENKI ERP) ورمز العملة يتبع اللغة («د.ع»/IQD)، ودائماً `dir="ltr"` و`whitespace-nowrap`. (3) `WorkflowActionBar`: أي إجراء له `roles` **يُخفى** عن من لا يملكه (والدور `null` مرفوض دائماً)؛ `showDenied` يعرضه معطّلاً بدل الإخفاء. هذا قرار مرتبط بـ«الدور null» المؤجّل بـ 0.7 — للأزرار المحمية الرد محسوم (مخفية). (4) `PayslipLine.rate` نسبة مئوية (5 = 5%) وليست كسراً. (5) `EmployeeSelect` يجلب من `/api/hr/employees` (يُبنى بـ 0.9) ويقبل `employees` جاهزة كبديل — لأن التحقق البصري الآن قبل وجود الـ API. (6) صفحة `/dev/components` تحتوي بيانات inline (أمثلة 12.2/12.3 من الدراسة) وهذا استثناء مقصود لصفحة مطوّر؛ الشاشات الحقيقية تجلب من `/api` (قاعدة CLAUDE.md #2). (7) الفقاعات الثنائية الاتجاه (bidi): استخدمت `<bdi dir="ltr">` للأكواد والأحجام والتواريخ داخل نص عربي، و`dir="auto"` لتسمية trend بـ `KPICard`، لتفادي انعكاس `+3.2%` و`180 KB`.
- **مشاكل/مؤجّل**: (1) `StatusBadge` لا يعرف حالات الرواتب بعد — كل موديول يمرّر label+tone (`Draft/Calculated/…` → tones) من عنده. (2) `DataTable` بلا اختيار صفوف/تصدير (يُضاف عند الحاجة بالموديولات). (3) اكتشفت أن `preview_stop` أحياناً يترك عملية `next` يتيمة على المنفذ 3000؛ تحققت وأنهيتها يدوياً (لا تمسح `.next` والـ dev server شغّال).
- **التحقق الفعلي**: بالمتصفح على `/dev/components` (فاتح/غامق، RTL): KPICards (اتجاه السهم ولونه حسب `goodDirection`)، DataTable (بحث، فلتر Profile، ترتيب، مجاميع، ترقيم «صفحة 1 من 3»، حالتا loading/error)، `WorkflowActionBar` بالأدوار الأربعة (مسؤول رواتب: Submit فقط؛ مدير HR: Approve؛ محاسب: Post + Reverse معطّل) ومودال التأكيد ينفّذ الإجراء، `MoneyInput` (يقبل الأرقام والنقطة ويرفض الحروف، يعرض الفواصل عند فقدان التركيز ويخرج `number|null`)، رفع مرفق وهمي (جارٍ الرفع ← الحجم والتاريخ)، `PayslipLineTable` بمثال 12.2 (مجموع الاستحقاقات 1,270,300)، `JournalPreview` بمثال 12.3 (مدين = دائن = **1,410,736** «متوازن») وحالة غير متوازنة تعرض الفرق، `ModuleScreensGrid` (19 رابط رواتب مجمّعة). `npm run build` و`eslint` نجحا بدون تحذيرات. **لم يُجرَّب**: `EmployeeSelect` بوضع الجلب (يُتحقق بـ 0.9).
- **الخطوة الجاية**: 0.9 — `lib/mock-api.ts` (تأخير 300–600ms) + `lib/payroll/store.ts` (in-memory store مع reset) + `/api/health` + نسخ بيانات HR (`employees`, `attendance`, `leaveRequests`, `rewardsDisciplinary`, `positions`) إلى `mock-data/hr/` وربط `/api/hr/employees`؛ ثم بوابة التحقق بالمتصفح من المستخدم.

## 2026-09-20

- **الموديول**: الأساس المشترك (Phase 0) — 0.9 Mock infra (**آخر خطوات المرحلة 0**)
- **المُنجز**:
  - `lib/mock-api.ts`: `randomDelay` (300–600ms)، `readMockJson`/`readMockData`، `MockApiError`، و`mockResponse(request, producer)` (تأخير + تحويل الأخطاء لـ JSON + `?mockFail=1` يجبر 500 + `?mockDelay=<ms>`).
  - `lib/payroll/store.ts`: in-memory store مُبذَّر كسولاً من `mock-data/*.json` ومحفوظ على `globalThis` (ما يمسحه إعادة تحميل الـ dev)، بدوال `collection/findById/insertItem/updateItem/removeItem/nextNumber/resetStore/storeStats`.
  - **الراوتات**: `GET /api/health` (بلا تأخير + إحصاء الـ store)، `POST /api/mock/reset`، وراوتات HR للقراءة: `/api/hr/employees` (فلاتر `status` و`employmentType` و`department` و`q`)، `/api/hr/employees/[id]` (404 عند الغياب)، `/api/hr/attendance` (`employeeId/from/to`)، `/api/hr/leave-requests`، `/api/hr/rewards-discipline`، `/api/hr/positions`.
  - **بيانات HR** بـ `mock-data/hr/{employees,attendance,leave-requests,rewards-discipline,positions}.json` مشتقة من Enki-Workspace-Mock بسكربت لمرة واحدة (فحص أن كل `employeeId` مرجعي موجود). 21 موظف: 12 Permanent + 7 Contract + 2 Temporary؛ الحالات: 16 active + 2 on_leave (emp-009 مرضية طويلة، emp-017 أمومة → حالات LWP) + 3 مغادرين (emp-014 استقالة 2026-08-31، emp-018 إنهاء 2026-07-31، emp-019 أرشيف 2024-12-31 → حالات نهاية الخدمة). موظفان بتعيين حديث (emp-016 بـ 2026-08-01، emp-021 بـ 2026-08-20 → proration).
  - `lib/types/hr.ts` موسّع (`Employee`, `Position`, `AttendanceRecord`, `LeaveRequest`, `RewardDisciplineRecord`) + `CLAUDE.md` فيه قسم «الـ Mock API (اصطلاحات)».
  - صفحة `/dev/components` صار `EmployeeSelect` فيها بوضع الجلب من الـ API.
- **قرارات تصميمية مهمة**: (1) **عدّلت بيانات الموظفين عن Enki** لتخدم الرواتب: حالات خط التوظيف (`candidate/selected/offer_sent/hired/joined/transferred/suspended`) صارت `active` لأنها ما توظيف بموك الرواتب (والموظفون لازم يكونون قابلين للدفع)؛ `employeeType` صار `employmentType` بقيم enum الدراسة (`Consultant` ← `Contract` لأن الدراسة ما فيها Consultant)؛ أضفت `terminationDate` و`numOfChildren` و`salaryType` و`currencyCode` و`bankCardNo` (حقول Employee الحقيقية بالدراسة 2/8.2) و`departmentEn`/`positionEn` للواجهة الإنكليزية؛ حذفت `sector/project/passportNo/personalEmail/emergencyContact/createdAt` لعدم الحاجة. (2) بيانات HR الثابتة تمر عبر الـ store أيضاً (ليتوحّد سلوك الـ reset). (3) **`hr/attendance-summary.json` و`leave-periods.json` و`holidays.json` مؤجّلة** للموديولات 4 و5 (كما بالـ specs) — الحين الخام فقط. (4) الأسماء اللي بـ `mock-data/hr/` بصيغة kebab-case (`leave-requests.json`) بدل camelCase عند Enki.
- **مشاكل/مؤجّل**: (1) `preview_stop` يترك عملية `next` يتيمة على المنفذ 3000 — أنهيتها يدوياً بعد كل تشغيل (تحقق: `Get-NetTCPConnection -LocalPort 3000`). (2) ما في PUT/POST حقيقي بعد — أول استخدام فعلي للـ store بالموديول 1 (`1.2`). (3) `bankCardNo` أرقام وهمية.
- **التحقق الفعلي**: بالمتصفح والـ dev server: `/api/health` ← `{status:"ok"}` ويعرض ما حُمّل بالـ store؛ `/api/hr/employees` ← 21؛ `status=active,on_leave` ← 18؛ `employmentType=Permanent` ← 12؛ البحث بـ «فاطمة» ← فاطمة عادل الربيعي؛ `/employees/emp-006` ← Fatima Adel Al-Rubaie؛ `emp-999` ← 404 برسالة؛ `?mockFail=1` ← 500؛ attendance لـ emp-001 ← 6، leave ← 13، disciplinary ← 6، positions ← 16؛ التأخير الفعلي 334–608ms، `?mockDelay=50` ← 63ms؛ `POST /api/mock/reset` ← `{ok:true}` ويفرّغ الـ store. **`EmployeeSelect` بوضع الجلب** يعرض الموظفين مرتّبين بالعربي بقائمة RTL. `npm run build` و`eslint` نجحا (8 راوتات API).
- **الخطوة الجاية**: **بوابة المرحلة 0** — المستخدم يتأكد بالمتصفح: تسجيل الدخول، الشعار بالوضعين، قلب الاتجاه، لوحة الموديولات، تبديل الدور (+ `/dev/components` للمكوّنات). بعد موافقته: الموديول 1 (`prompts-payroll-config.md` 1.1).

## 2026-09-20

- **الموديول**: 1 مرجعيات الرواتب (Config) — 1.1 راوتات فارغة
- **المُنجز**:
  - راوتات `app/(shell)/payroll/`: `page.tsx` (الصفحة الرئيسية = `PageHeader` + `ModuleScreensGrid` للأقسام كلها)، و`config/{components,profiles,structures,grade-scales,tax,pension,social-security}/page.tsx`، و`permissions/page.tsx`، و`config/page.tsx` (redirect إلى `/payroll`). كلها بدون بيانات: عنوان + وصف + لوحة «الشاشة جاهزة كهيكل فقط».
  - مكوّنات مشتركة جديدة: `components/page-header.tsx` (عنوان + وصف + slot إجراءات)، `components/empty-state.tsx` (لوحة فارغة عامة بأيقونة/عنوان/وصف)، `components/payroll/scaffold-screen.tsx` (الاثنان معاً لشاشة لم تُبنَ بعد).
  - `lib/i18n/payroll-labels.ts`: `payrollScreenDescriptions` (وصف كل شاشة، عربي/إنكليزي) و`scaffoldLabels`.
  - روابط الـ Sidebar تحت «الرواتب» **كانت جاهزة من 0.6** (`payrollChildren` بـ `lib/navigation.ts` بأسماء ar/en) فما احتاجت تعديل؛ الـ breadcrumbs تشتغل تلقائياً عبر `resolveCrumbLabel`.
- **قرارات تصميمية مهمة**: (1) **`app/(shell)/payroll/[[...slug]]` صار `[...slug]`** (catch-all إلزامي): الـ optional catch-all يتعارض مع `payroll/page.tsx` بنفس المستوى. الشاشات غير المبنية (`/payroll/loans`, `/runs`…) ما زالت تسقط على ComingSoon. (2) `/payroll/config` يعمل redirect لـ `/payroll` لأنه يظهر كخطوة breadcrumb («مرجعيات الرواتب») بدون شاشة خاصة به، والصفحة الرئيسية تعرض الأقسام كلها. (3) أي مسار غير معرّف تحت `/payroll/**` (مثل `/payroll/config/nope`) يبقى يعرض ComingSoon بحالة 200 — نفس سلوك 0.6، مقبول للموك أب. (4) الصفحة الرئيسية بلا KPIs بعد (تُضاف بـ 1.10).
- **مشاكل/مؤجّل**: الـ dev server القائم (PID 15584، مشروعنا) كان يخدم جدول راوتات قديماً بعد إعادة تسمية مجلد الـ catch-all (`/payroll/loans` رجّع 404) — أنهيته وأعدت تشغيله عبر `preview_start` فصلح. **إذا كنت تشغّل `npm run dev` بترمنال خارجي أعد تشغيله** بعد هذا التغيير. أنهيت الخادم بعد التحقق فالمنفذ 3000 فاضي.
- **التحقق الفعلي**: بالمتصفح: `/payroll` (شبكة الأقسام)، و7 راوتات config + permissions ← 200 بالهيكل (عنوان + وصف)، `/payroll/config` ← redirect لـ `/payroll`، `/payroll/loans` و`/payroll/runs` ← ComingSoon. عربي/فاتح: breadcrumbs «الرئيسية › الرواتب › مرجعيات الرواتب › بنود الراتب» وإبراز عنصر الـ Sidebar؛ إنكليزي/غامق على `/payroll/config/tax` سليم. لا أخطاء console فعلية (أخطاء WebSocket الخاصة بالـ HMR فقط، ومعروفة). `eslint` نظيف و`npm run build` نجح (الراوتات الجديدة static).
- **الخطوة الجاية**: 1.2 — `mock-data/payroll/*.json` (components, profiles, structures, grade-scales, tax/pension/social-security configs, gl-accounts, config-activity-log) + Route Handlers `app/api/payroll/config/**` + `lib/payroll/types.ts`.
</div>
