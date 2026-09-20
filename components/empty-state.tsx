"use client";

import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

import { useLocale, type Locale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Label = Record<Locale, string>;

/** Dashed placeholder panel for a screen or section with nothing to show yet. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  children,
  className,
}: {
  title: Label;
  description?: Label;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{t(title)}</h2>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{t(description)}</p>
      )}
      {children}
    </div>
  );
}
