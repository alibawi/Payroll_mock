"use client";

import { useLocale } from "@/components/locale-provider";
import { ModuleCard } from "@/components/shell/module-card";
import { appLabels } from "@/lib/i18n/labels";
import { moduleNavItems } from "@/lib/navigation";

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-7xl space-y-10 pt-6 md:pt-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t(appLabels.welcome)}
        </h1>
        <p className="text-muted-foreground">{t(appLabels.welcomeSubtitle)}</p>
      </header>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {moduleNavItems.map((item) => (
          <ModuleCard key={item.key} item={item} />
        ))}
      </section>
    </div>
  );
}
