"use client";

import { Banknote, Gavel, Hourglass, Landmark, Scale, Wallet } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import { useCan, useCanSeeAmounts } from "@/lib/payroll/use-can";

type Totals = { periodKey: string; gross: number; net: number; employerCost: number; employees: number; runs: number };
type RunSummary = { period: string; current: Totals; previous: Totals; trend: Totals[]; waiting: { total: number; calculated: number; pendingApproval: number; approved: number }; netProtection: number };
type ReportSummary = { periodKey: string; outstandingAmount: number; outstandingRemittances: number; eosPending: { count: number; amount: number } };
type LoanSummary = { outstandingTotal: number; activeCount: number; pendingApproval: number; dueThisMonth: { count: number; amount: number } };
type PenaltySummary = { pendingApproval: number; applyingCount: number; applyingRemaining: number; dueThisMonth: number };

const L = {
  title: { ar: "لوحة الإدارة العليا", en: "Executive dashboard" },
  description: { ar: "كلفة الرواتب والالتزامات المستحقة والسلف والعقوبات والدورات المعلّقة في نظرة واحدة", en: "Payroll cost, amounts owed, outstanding loans, penalties and pending runs at a glance" },
  cost: { ar: "كلفة الرواتب (صاحب العمل)", en: "Payroll cost (employer)" },
  net: { ar: "صافي الرواتب", en: "Net payroll" },
  owed: { ar: "التزامات مستحقة التوريد", en: "Amounts owed to authorities" },
  loans: { ar: "السلف والقروض القائمة", en: "Outstanding loans" },
  penalties: { ar: "عقوبات قيد الاستقطاع", en: "Penalties being deducted" },
  pending: { ar: "دورات معلّقة", en: "Pending runs" },
  vs: { ar: "عن الشهر السابق", en: "vs previous month" },
  statements: { ar: "كشف غير مورَّد", en: "statements outstanding" },
  active: { ar: "قرض/سلفة نشطة", en: "active loans" },
  dueNow: { ar: "مستحق هذا الشهر", en: "due this month" },
  remaining: { ar: "المتبقي", en: "remaining" },
  actionNeeded: { ar: "تحتاج إجراء", en: "need action" },
  trend: { ar: "اتجاه كلفة الرواتب — 6 أشهر", en: "Payroll cost — 6 months" },
  links: { ar: "اذهب إلى", en: "Go to" },
} as const;

function trendOf(current: number, previous: number, text: string) {
  if (!previous) return undefined;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}% ${text}`, goodDirection: "down" as const };
}

/** Executive dashboard (polish 7.1): the headline numbers of modules 1–6 with trend arrows. */
export default function ExecutiveDashboardPage() {
  const { t } = useLocale();
  const can = useCan();
  const seeAmounts = useCanSeeAmounts();
  const allowed = can("payroll.run", "view") && can("payroll.report", "view");
  const runs = useApi<RunSummary>(allowed ? "/api/payroll/runs/summary" : null);
  const reports = useApi<ReportSummary>(allowed ? "/api/payroll/reports/summary" : null);
  const loans = useApi<LoanSummary>(allowed ? "/api/payroll/loans/summary" : null);
  const penalties = useApi<PenaltySummary>(allowed ? "/api/payroll/penalties/summary" : null);

  if (!allowed) return <EmptyState title={configCommon.readOnly} />;
  const money = (v: number | undefined) => (v === undefined ? "…" : seeAmounts ? v.toLocaleString("en-US") : "••••••");
  const r = runs.data;
  const rep = reports.data;
  const loan = loans.data;
  const pen = penalties.data;
  const max = Math.max(1, ...(r?.trend.map((x) => x.employerCost) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} description={L.description} actions={r && <span className="text-sm text-muted-foreground">{formatPeriod(r.period)}</span>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard title={t(L.cost)} value={money(r?.current.employerCost)} icon={Banknote} tone="info" description={r ? `${r.current.employees} ${t({ ar: "موظف", en: "employees" })}` : undefined} trend={r && seeAmounts ? trendOf(r.current.employerCost, r.previous.employerCost, t(L.vs)) : undefined} />
        <KPICard title={t(L.net)} value={money(r?.current.net)} icon={Wallet} tone="success" trend={r && seeAmounts ? trendOf(r.current.net, r.previous.net, t(L.vs)) : undefined} />
        <KPICard title={t(L.owed)} value={money(rep?.outstandingAmount)} icon={Landmark} tone={rep && rep.outstandingAmount > 0 ? "warning" : "neutral"} description={rep ? `${rep.outstandingRemittances} ${t(L.statements)}` : undefined} />
        <KPICard title={t(L.loans)} value={money(loan?.outstandingTotal)} icon={Scale} description={loan ? `${loan.activeCount} ${t(L.active)} · ${loan.dueThisMonth.amount.toLocaleString("en-US")} ${t(L.dueNow)}` : undefined} />
        <KPICard title={t(L.penalties)} value={money(pen?.applyingRemaining)} icon={Gavel} description={pen ? `${pen.applyingCount} · ${pen.dueThisMonth.toLocaleString("en-US")} ${t(L.dueNow)}` : undefined} tone={pen && pen.pendingApproval > 0 ? "warning" : "neutral"} />
        <KPICard title={t(L.pending)} value={r ? r.waiting.total : "…"} icon={Hourglass} tone={r && r.waiting.total > 0 ? "warning" : "neutral"} description={r ? `${r.waiting.calculated} / ${r.waiting.pendingApproval} / ${r.waiting.approved}` : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <DetailSection title={t(L.trend)} className="lg:col-span-2">
          {seeAmounts && r ? (
            <div className="flex h-48 items-end gap-3" role="img" aria-label={t(L.trend)}>
              {r.trend.map((x) => (
                <div key={x.periodKey} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span dir="ltr" className="text-[10px] tabular-nums text-muted-foreground">{x.employerCost ? `${(x.employerCost / 1_000_000).toFixed(1)}M` : "—"}</span>
                  <div className="flex w-full max-w-14 flex-1 items-end">
                    <div className="flex w-full flex-col justify-end rounded-t-md bg-tile-indigo/25" style={{ height: `${(x.employerCost / max) * 100}%` }}>
                      <div className="w-full rounded-t-md bg-primary" style={{ height: `${x.employerCost ? (x.net / x.employerCost) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span dir="ltr" className="text-[11px] text-muted-foreground">{formatPeriod(x.periodKey)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{seeAmounts ? "…" : "••••••"}</p>
          )}
        </DetailSection>

        <DetailSection title={t(L.links)}>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/payroll/runs", label: payrollNavLabels.runs },
              { href: "/payroll/remittances", label: payrollNavLabels.remittances },
              { href: "/payroll/loans", label: payrollNavLabels.loans },
              { href: "/payroll/penalties", label: payrollNavLabels.penalties },
              { href: "/payroll/reports", label: payrollNavLabels.reports },
              { href: "/payroll", label: { ar: "الرواتب", en: "Payroll" } },
            ].map((x) => (
              <li key={x.href}><Link href={x.href} className="text-primary hover:underline">{t(x.label)}</Link></li>
            ))}
          </ul>
        </DetailSection>
      </div>
    </div>
  );
}
