"use client";

import { CircleAlert, CircleCheck, RefreshCw } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { goldenLabels } from "@/lib/i18n/payroll-run-labels";
import type { GoldenScenario, GoldenStatus } from "@/lib/payroll/__golden__/golden";
import { useApi } from "@/lib/payroll/api-client";
import { formatNumber } from "@/lib/payroll/format";
import { formatStamp } from "@/lib/payroll/run-view";
import { cn } from "@/lib/utils";

const TONES: Record<GoldenStatus, StatusTone> = { match: "success", documented: "warning", fail: "destructive" };
const LABELS = { match: goldenLabels.match, documented: goldenLabels.documented, fail: goldenLabels.fail } as const;

/** Developer screen (spec §10 screen 11): the study's worked examples run through the engine, live. */
export default function GoldenPage() {
  const { t } = useLocale();
  const golden = useApi<{ scenarios: GoldenScenario[]; passed: boolean; ranAt: string }>("/api/payroll/golden");
  const g = golden.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title={goldenLabels.title}
        description={goldenLabels.description}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={golden.reload} disabled={golden.loading}>
            <RefreshCw className={cn("size-4", golden.loading && "animate-spin")} />
            {t(goldenLabels.rerun)}
          </Button>
        }
      />

      {golden.error && <p role="alert" className="text-sm text-destructive">{t(commonLabels.loadError)}</p>}
      {g && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
            g.passed ? "border-secondary-green/40 bg-secondary-green/10" : "border-destructive/30 bg-destructive/5"
          )}
        >
          {g.passed ? <CircleCheck className="size-4 text-secondary-green" /> : <CircleAlert className="size-4 text-destructive" />}
          {t(g.passed ? goldenLabels.allPass : goldenLabels.someFail)}
          <span className="ms-auto text-xs font-normal text-muted-foreground">{t(goldenLabels.ranAt)}: <bdi dir="ltr">{formatStamp(g.ranAt)}</bdi></span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t(goldenLabels.legend)}</p>

      {golden.loading && !g && <p className="py-10 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}

      {g?.scenarios.map((s) => (
        <DetailSection
          key={s.id}
          title={
            <span className="flex items-center gap-2">
              {t(s.title)}
              <StatusBadge tone={s.passed ? "success" : "destructive"} label={t(s.passed ? goldenLabels.match : goldenLabels.fail)} />
            </span>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{t(s.description)}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t(goldenLabels.check)}</th>
                  <th className="px-3 py-2 text-end font-medium">{t(goldenLabels.study)}</th>
                  <th className="px-3 py-2 text-end font-medium">{t(goldenLabels.expected)}</th>
                  <th className="px-3 py-2 text-end font-medium">{t(goldenLabels.engine)}</th>
                  <th className="px-3 py-2 text-start font-medium">{t(goldenLabels.result)}</th>
                </tr>
              </thead>
              <tbody>
                {s.checks.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      {t(c.label)}
                      {c.note && <span className="block text-xs text-muted-foreground">{t(c.note)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums text-muted-foreground"><bdi dir="ltr">{c.study === null ? "—" : formatNumber(c.study)}</bdi></td>
                    <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{formatNumber(c.expected)}</bdi></td>
                    <td className={cn("px-3 py-2.5 text-end font-semibold tabular-nums", c.status === "fail" && "text-destructive")}><bdi dir="ltr">{formatNumber(c.actual)}</bdi></td>
                    <td className="px-3 py-2.5"><StatusBadge tone={TONES[c.status]} label={t(LABELS[c.status])} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      ))}
    </div>
  );
}
