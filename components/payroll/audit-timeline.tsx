"use client";

import { CirclePlus, Lock, Pencil, Power, PowerOff } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { auditActionLabels, auditLabels, componentScreenLabels } from "@/lib/i18n/payroll-config-labels";
import type { ConfigActivity } from "@/lib/payroll/types";

const ICONS = {
  Created: CirclePlus,
  Updated: Pencil,
  Activated: Power,
  Deactivated: PowerOff,
  Closed: Lock,
} as const;

function formatStamp(iso: string, locale: string) {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const time = d.toLocaleTimeString(locale === "ar" ? "en-GB" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

/** Audit trail of a configuration entity (spec §8 screen 10) rendered with the shared Timeline. */
export function AuditTimeline({ activity }: { activity: ConfigActivity[] }) {
  const { locale, t } = useLocale();

  const items: TimelineItem[] = activity.map((a) => ({
    id: a.id,
    icon: ICONS[a.action],
    title: (
      <>
        {t(auditActionLabels[a.action])} — {t(a.summary)}
      </>
    ),
    timestamp: formatStamp(a.timestamp, locale),
    description: (
      <>
        <span>
          {t(auditLabels.by)} {t(a.actor.name)}
        </span>
        {a.changes?.map((change) => (
          <span key={change.field} className="mt-1 block text-xs">
            <bdi dir="ltr" className="font-medium text-foreground/80">
              {change.field}
            </bdi>
            : <bdi dir="ltr">{change.from}</bdi> → <bdi dir="ltr">{change.to}</bdi>
          </span>
        ))}
      </>
    ),
  }));

  return <Timeline items={items} emptyMessage={t(componentScreenLabels.noAudit)} />;
}
