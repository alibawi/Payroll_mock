"use client";

import { Banknote, Building2, CalendarClock, FileSpreadsheet, Gavel, Landmark, ReceiptText, ScrollText, TrendingUp, UserMinus } from "lucide-react";
import Link from "next/link";

import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { useCanSeeAmounts } from "@/lib/payroll/use-can";
import { reportHubLabels as L } from "@/lib/i18n/payroll-report-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import { useCan } from "@/lib/payroll/use-can";

type Summary = {
  periodKey: string;
  tax: number;
  pension: { employee: number; employer: number };
  socialSecurity: { employee: number; employer: number };
  bank: { count: number; total: number };
  eosPending: { count: number; amount: number };
  employerCost: number;
  outstandingRemittances: number;
};

const CARDS = [
  { href: "/payroll/reports/payroll-register", icon: FileSpreadsheet, card: L.cards.register },
  { href: "/payroll/reports/payroll-register", icon: ReceiptText, card: L.cards.payslip },
  { href: "/payroll/reports/bank-transfer", icon: Landmark, card: L.cards.bank },
  { href: "/payroll/remittances", icon: Building2, card: L.cards.remittances },
  { href: "/payroll/end-of-service", icon: UserMinus, card: L.cards.eos },
  { href: "/payroll/reports/deferred-deductions", icon: CalendarClock, card: L.cards.deferred },
  { href: "/payroll/reports/employer-cost", icon: TrendingUp, card: L.cards.employerCost },
  { href: "/payroll/penalties/register", icon: Gavel, card: L.cards.penalties },
];

export default function ReportsHubPage() {
  const { t } = useLocale();
  const can = useCan();
  const seeAmounts = useCanSeeAmounts();
  const allowed = can("payroll.report", "view");
  const summary = useApi<Summary>(allowed ? "/api/payroll/reports/summary" : null);
  const s = summary.data;
  const loading = summary.loading ? "…" : "—";
  const money = (v: number) => (seeAmounts ? v.toLocaleString("en-US") : "••••••");
  const forPeriod = s ? `${t(L.forPeriod)} ${formatPeriod(s.periodKey)}` : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} description={L.description} />

      {allowed && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title={t(L.kpiTax)} value={s ? money(s.tax) : loading} description={forPeriod} icon={ScrollText} tone="warning" />
          <KPICard title={t(L.kpiPension)} value={s ? money(s.pension.employee + s.pension.employer) : loading} description={s && seeAmounts ? `${s.pension.employee.toLocaleString("en-US")} + ${s.pension.employer.toLocaleString("en-US")}` : forPeriod} icon={Building2} tone="info" />
          <KPICard title={t(L.kpiSs)} value={s ? money(s.socialSecurity.employee + s.socialSecurity.employer) : loading} description={s && seeAmounts ? `${s.socialSecurity.employee.toLocaleString("en-US")} + ${s.socialSecurity.employer.toLocaleString("en-US")}` : forPeriod} icon={Building2} tone="info" />
          <KPICard title={t(L.kpiBank)} value={s ? s.bank.count : loading} description={s ? `${money(s.bank.total)} · ${forPeriod}` : undefined} icon={Landmark} />
          <KPICard title={t(L.kpiEos)} value={s ? s.eosPending.count : loading} description={s ? money(s.eosPending.amount) : undefined} icon={UserMinus} tone={s && s.eosPending.count > 0 ? "warning" : "neutral"} />
          <KPICard title={t(L.kpiEmployerCost)} value={s ? money(s.employerCost) : loading} description={forPeriod} icon={Banknote} tone="success" />
          <KPICard title={t(L.kpiOutstanding)} value={s ? s.outstandingRemittances : loading} icon={Building2} tone={s && s.outstandingRemittances > 0 ? "warning" : "neutral"} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(({ href, icon: Icon, card }, i) => (
          <Link key={`${href}-${i}`} href={href} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30">
            <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <h2 className="text-sm font-semibold group-hover:text-primary">{t(card.title)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t(card.body)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
