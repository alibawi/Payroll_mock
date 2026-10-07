"use client";

import { Banknote, ClipboardList, Hourglass, ShieldAlert, Users, Wallet } from "lucide-react";
import Link from "next/link";

import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { DetailSection } from "@/components/payroll/detail-section";
import { buttonVariants } from "@/components/ui/button";
import { runDashboardLabels as L } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import { useCan, useCanSeeAmounts } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Totals = { periodKey: string; gross: number; net: number; deductions: number; employerCost: number; employees: number; runs: number };
type MixKey = "tax" | "socialSecurity" | "pension" | "loans" | "penalties" | "other";
type Summary = {
  period: string;
  current: Totals;
  previous: Totals;
  trend: Totals[];
  deductionMix: Record<MixKey, number>;
  waiting: { total: number; calculated: number; pendingApproval: number; approved: number };
  netProtection: number;
  pendingInputs: number;
};

const MIX_KEYS: MixKey[] = ["tax", "socialSecurity", "pension", "loans", "penalties", "other"];
const MIX_COLORS: Record<MixKey, string> = {
  tax: "bg-primary",
  socialSecurity: "bg-secondary-green",
  pension: "bg-tile-indigo",
  loans: "bg-secondary-orange",
  penalties: "bg-destructive",
  other: "bg-muted-foreground/60",
};

function trend(current: number, previous: number, text: string) {
  if (!previous) return undefined;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}% ${text}`, goodDirection: "down" as const };
}

/** Payroll-cycle block of the module dashboard (spec §8): current totals, 6-month cost trend, deduction mix. */
export function RunDashboard() {
  const { t } = useLocale();
  const can = useCan();
  const seeAmounts = useCanSeeAmounts();
  const allowed = can("payroll.run", "view");
  const summary = useApi<Summary>(allowed ? "/api/payroll/runs/summary" : null);
  const s = summary.data;
  if (!allowed) return null;

  const loading = summary.loading ? "…" : "—";
  const money = (v: number) => (seeAmounts ? v.toLocaleString("en-US") : "••••••");
  const max = Math.max(1, ...(s?.trend.map((x) => x.employerCost) ?? [1]));
  const mixTotal = s ? Object.values(s.deductionMix).reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {t(L.section)}
          {s && (
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              {t(L.currentPeriod)}: <bdi dir="ltr">{formatPeriod(s.period)}</bdi>
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <Link href="/payroll/config/golden" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t(L.golden)}
          </Link>
          <Link href="/payroll/runs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {t(L.openRuns)}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(L.gross)} value={s ? money(s.current.gross) : loading} icon={Banknote} trend={s && seeAmounts ? trend(s.current.gross, s.previous.gross, t(L.vsPrev)) : undefined} />
        <KPICard title={t(L.net)} value={s ? money(s.current.net) : loading} icon={Wallet} tone="success" trend={s && seeAmounts ? trend(s.current.net, s.previous.net, t(L.vsPrev)) : undefined} />
        <KPICard title={t(L.employerCost)} value={s ? money(s.current.employerCost) : loading} icon={Banknote} tone="info" trend={s && seeAmounts ? trend(s.current.employerCost, s.previous.employerCost, t(L.vsPrev)) : undefined} />
        <KPICard title={t(L.employees)} value={s ? s.current.employees : loading} icon={Users} description={s ? `${s.current.runs} ${t({ ar: "دورات", en: "runs" })}` : undefined} />
        <KPICard
          title={t(L.waiting)}
          value={s ? s.waiting.total : loading}
          icon={ClipboardList}
          tone={s && s.waiting.total > 0 ? "warning" : "neutral"}
          description={s ? `${s.waiting.calculated} ${t(L.calculated)} · ${s.waiting.pendingApproval} ${t(L.pendingApproval)} · ${s.waiting.approved} ${t(L.approved)}` : undefined}
        />
        <KPICard title={t(L.netProtection)} value={s ? s.netProtection : loading} icon={ShieldAlert} tone={s && s.netProtection > 0 ? "warning" : "neutral"} />
        <KPICard title={t(L.pendingInputs)} value={s ? s.pendingInputs : loading} icon={Hourglass} tone={s && s.pendingInputs > 0 ? "warning" : "neutral"} />
      </div>

      {s && seeAmounts && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DetailSection title={t(L.trend)} className="lg:col-span-2">
            <div className="flex h-44 items-end gap-3" role="img" aria-label={t(L.trend)}>
              {s.trend.map((x) => (
                <div key={x.periodKey} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span dir="ltr" className="text-[10px] tabular-nums text-muted-foreground">
                    {x.employerCost ? `${(x.employerCost / 1_000_000).toFixed(1)}M` : t(L.noData)}
                  </span>
                  <div className="flex w-full max-w-14 flex-1 items-end">
                    <div className="flex w-full flex-col justify-end rounded-t-md bg-tile-indigo/25" style={{ height: `${(x.employerCost / max) * 100}%` }}>
                      <div className="w-full rounded-t-md bg-primary" style={{ height: `${x.employerCost ? (x.net / x.employerCost) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span dir="ltr" className="text-[11px] text-muted-foreground">{formatPeriod(x.periodKey)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-tile-indigo/25" />{t(L.employerCost)}</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />{t(L.net)}</span>
            </div>
          </DetailSection>

          <DetailSection title={t(L.mix)}>
            {mixTotal === 0 ? (
              <p className="text-sm text-muted-foreground">{t(L.noData)}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  {MIX_KEYS.map((k) => (
                    <div key={k} className={MIX_COLORS[k]} style={{ width: `${(s.deductionMix[k] / mixTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {MIX_KEYS.filter((k) => s.deductionMix[k] > 0).map((k) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className={cn("size-2.5 rounded-sm", MIX_COLORS[k])} />{t(L[k])}</span>
                      <span dir="ltr" className="tabular-nums">
                        {s.deductionMix[k].toLocaleString("en-US")} <span className="text-xs text-muted-foreground">({Math.round((s.deductionMix[k] / mixTotal) * 100)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DetailSection>
        </div>
      )}
    </section>
  );
}
