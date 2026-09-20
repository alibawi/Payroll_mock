"use client";

import { useLocale } from "@/components/locale-provider";
import { appLabels, commonLabels, moduleLabels, roleLabels } from "@/lib/i18n/labels";

// Internal locale/RTL reference page (dev only) — verifies docs/identity.md text, fonts and direction.
export default function LocaleDevPage() {
  const { locale, dir, setLocale, t } = useLocale();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(appLabels.welcome)}</h1>
        <div className="flex gap-2">
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                locale === l ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </header>
      <p className="text-muted-foreground">
        {t(appLabels.welcomeSubtitle)} — <code>{locale}</code> / <code>{dir}</code>
      </p>
      <section className="flex flex-wrap gap-2">
        {Object.values(roleLabels).map((r) => (
          <span key={r.en} className="rounded-full border bg-card px-3 py-1 text-sm">
            {t(r)}
          </span>
        ))}
      </section>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.values(moduleLabels).map((m) => (
          <span key={m.en} className="ps-3 text-sm border-s-2 border-primary">
            {t(m)}
          </span>
        ))}
      </section>
      <section className="flex flex-wrap gap-2 text-sm">
        {Object.values(commonLabels)
          .slice(0, 12)
          .map((c) => (
            <span key={c.en} className="rounded bg-muted px-2 py-1">
              {t(c)}
            </span>
          ))}
      </section>
      <p className="tabular-nums">
        1,270,300 {t(commonLabels.currencySymbol)}
      </p>
    </main>
  );
}
