"use client";

import type { ReactNode } from "react";

import { useLocale, type Locale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Label = Record<Locale, string>;

/** Screen title block: heading + optional description, with an actions slot at the inline end. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: Label;
  description?: Label;
  actions?: ReactNode;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{t(title)}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{t(description)}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
