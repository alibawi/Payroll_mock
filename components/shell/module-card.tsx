"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { moduleCardLabels } from "@/lib/i18n/labels";
import type { ModuleNavItem } from "@/lib/navigation";
import { tileStyles } from "@/lib/tile-styles";
import { cn } from "@/lib/utils";

/** Launcher card for the home page (docs/identity.md 2.3). */
export function ModuleCard({ item }: { item: ModuleNavItem }) {
  const { t } = useLocale();
  const { icon: Icon, tile, shortcut, href, key } = item;
  const style = tileStyles[tile];
  const card = moduleCardLabels[key];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring",
        style.card
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-12 items-center justify-center rounded-xl", style.icon)}>
          <Icon className="size-6" />
        </span>
        <span className="flex items-center gap-2">
          <ArrowUpRight
            className={cn(
              "size-4 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100",
              style.title.replace("group-hover:", "")
            )}
          />
          {shortcut && (
            <kbd
              dir="ltr"
              className={cn(
                "whitespace-nowrap rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors",
                style.badge
              )}
            >
              Ctrl {shortcut}
            </kbd>
          )}
        </span>
      </div>
      <div className="space-y-1.5">
        <h2 className={cn("text-lg font-bold text-foreground transition-colors", style.title)}>
          {t(card.title)}
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {t(card.description)}
        </p>
      </div>
    </Link>
  );
}
