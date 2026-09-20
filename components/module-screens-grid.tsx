"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { componentLabels } from "@/lib/i18n/labels";
import { moduleNavItems, type ModuleKey } from "@/lib/navigation";
import { tileStyles } from "@/lib/tile-styles";
import { cn } from "@/lib/utils";

/**
 * Card grid of a module's screens (its sidebar sub-sections), used as the module home page.
 * Children carrying a `group` heading start a new section; without groups it renders one grid.
 */
export function ModuleScreensGrid({
  moduleKey,
  columnsClassName = "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  moduleKey: ModuleKey;
  columnsClassName?: string;
}) {
  const { t } = useLocale();
  const moduleItem = moduleNavItems.find((item) => item.key === moduleKey);

  if (!moduleItem?.children || moduleItem.children.length === 0) return null;

  const Icon = moduleItem.icon;
  const style = tileStyles[moduleItem.tile];

  const sections: { heading?: string; items: typeof moduleItem.children }[] = [];
  for (const child of moduleItem.children) {
    if (child.group || sections.length === 0) {
      sections.push({ heading: child.group ? t(child.group) : undefined, items: [child] });
    } else {
      sections[sections.length - 1].items.push(child);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-foreground">{t(componentLabels.moduleScreens)}</h2>
      {sections.map((section, index) => (
        <div key={section.heading ?? index} className="space-y-2.5">
          {section.heading && (
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
              {section.heading}
            </h3>
          )}
          <div className={cn("grid gap-3", columnsClassName)}>
            {section.items.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 outline-none transition-all",
                  "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                  style.card
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    style.icon
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", style.title)}>
                  {t(child.label)}
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
