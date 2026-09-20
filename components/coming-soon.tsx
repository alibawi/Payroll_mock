"use client";

import { usePathname } from "next/navigation";
import { Construction } from "lucide-react";

import { useLocale, type Locale } from "@/components/locale-provider";
import { commonLabels } from "@/lib/i18n/labels";
import { resolveCrumbLabel } from "@/lib/navigation";

/** Placeholder screen. Without a `title` it resolves one from the current route (module / sub-section). */
export function ComingSoon({ title }: { title?: Record<Locale, string> }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const heading =
    (title ? title[locale] : resolveCrumbLabel(pathname, locale)) ??
    commonLabels.comingSoon[locale];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Construction className="size-6" />
      </span>
      <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t(commonLabels.comingSoonDescription)}
      </p>
    </div>
  );
}
