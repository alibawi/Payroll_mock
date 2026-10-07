"use client";

import { useLocale } from "@/components/locale-provider";
import { StatusBadge } from "@/components/status-badge";
import { configCommon, effectiveStatusLabels, effectiveStatusTones } from "@/lib/i18n/payroll-config-labels";
import { formatDate } from "@/lib/payroll/format";
import type { EffectiveStatus, LocalizedText } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

export type HistoryRecord = {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: EffectiveStatus;
  summary?: string;
  notes?: LocalizedText;
};

/** Selectable effective-dated history (Upcoming / Current / Expired) shared by tax, pension and social security. */
export function EffectiveHistory({
  records,
  selectedId,
  onSelect,
}: {
  records: HistoryRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
    <ol className="space-y-2">
      {records.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            onClick={() => onSelect(record.id)}
            aria-pressed={record.id === selectedId}
            className={cn(
              "w-full rounded-lg border px-3 py-2.5 text-start transition-colors hover:bg-muted/50",
              record.id === selectedId ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                <bdi dir="ltr">{formatDate(record.effectiveFrom)}</bdi>
                {" → "}
                {record.effectiveTo ? <bdi dir="ltr">{formatDate(record.effectiveTo)}</bdi> : t(configCommon.openEnded)}
              </span>
              <StatusBadge label={t(effectiveStatusLabels[record.status])} tone={effectiveStatusTones[record.status]} />
            </div>
            {record.summary && <p className="mt-1 text-xs text-muted-foreground">{record.summary}</p>}
            {record.notes && <p className="mt-0.5 text-xs text-muted-foreground">{t(record.notes)}</p>}
          </button>
        </li>
      ))}
    </ol>
  );
}
