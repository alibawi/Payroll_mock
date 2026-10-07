"use client";

import { TriangleAlert } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { illustrativeNotice } from "@/lib/i18n/payroll-config-labels";
import { cn } from "@/lib/utils";

/** Warning strip shown on every screen with legal figures (rates, brackets, exemptions) — spec §7. */
export function IllustrativeNotice({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-secondary-orange/40 bg-secondary-orange/10 px-3 py-2 text-sm",
        className
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-secondary-orange" />
      <p className="text-foreground/90">
        <span className="font-medium">{t(illustrativeNotice.title)}.</span> {t(illustrativeNotice.description)}
      </p>
    </div>
  );
}
