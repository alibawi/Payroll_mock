"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { appLabels, moduleLabels } from "@/lib/i18n/labels";
import { isWithinPath, moduleNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Horizontal, scrollable module strip under the topbar (see docs/assets/enki-erp-home.png). */
export function QuickAccess() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      <span className="flex shrink-0 items-center gap-2 border-e border-border pe-4 text-sm font-medium text-foreground">
        <Zap className="size-4" />
        {t(appLabels.quickAccess)}
      </span>
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 pt-1 [scrollbar-width:thin]">
        {moduleNavItems.map(({ key, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-tile-indigo transition-colors hover:bg-tile-indigo-bg",
              isWithinPath(pathname, href) && "bg-tile-indigo-bg font-semibold"
            )}
          >
            <Icon className="size-4" />
            {t(moduleLabels[key])}
          </Link>
        ))}
      </nav>
    </div>
  );
}
