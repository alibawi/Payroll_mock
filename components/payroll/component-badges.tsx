"use client";

import { useLocale } from "@/components/locale-provider";
import { StatusBadge } from "@/components/status-badge";
import {
  componentTypeLabels,
  componentTypeTones,
  flagShortLabels,
} from "@/lib/i18n/payroll-config-labels";
import type { PayrollComponent } from "@/lib/payroll/types";

export function ComponentTypeBadge({ type }: { type: PayrollComponent["componentType"] }) {
  const { t } = useLocale();
  return <StatusBadge label={t(componentTypeLabels[type])} tone={componentTypeTones[type]} />;
}

const FLAGS = ["isTaxable", "isPensionable", "isSocialSecurityBase", "isProratable", "reducesGross"] as const;

/** Compact chips for the base flags that are on (taxable / pensionable / SS base / prorated / cuts gross). */
export function ComponentFlagBadges({ component }: { component: PayrollComponent }) {
  const { t } = useLocale();
  const on = FLAGS.filter((flag) => component[flag]);
  if (on.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {on.map((flag) => (
        <StatusBadge
          key={flag}
          label={t(flagShortLabels[flag])}
          tone={flag === "reducesGross" ? "warning" : "neutral"}
          className="px-2 text-[11px]"
        />
      ))}
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useLocale();
  return (
    <StatusBadge
      label={active ? t({ ar: "نشط", en: "Active" }) : t({ ar: "معطّل", en: "Inactive" })}
      tone={active ? "success" : "neutral"}
    />
  );
}
