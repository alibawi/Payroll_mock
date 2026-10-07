"use client";

import { Banknote, ClipboardList, Plus, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { useRole } from "@/components/role-provider";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { runListLabels, runStatusLabels, runStatusTones, runTypeLabels } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PayrollProfile, RunRow, RunStatus } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Row = RunRow & { search: string };
type Totals = { periodKey: string; gross: number; net: number; employerCost: number; employees: number; runs: number };
type Summary = { period: string; current: Totals; previous: Totals; waiting: { total: number; calculated: number; pendingApproval: number; approved: number } };

const TABS: { key: string; label: { ar: string; en: string }; statuses: RunStatus[] | null }[] = [
  { key: "all", label: runListLabels.tabAll, statuses: null },
  { key: "draft", label: runListLabels.tabDraft, statuses: ["Draft"] },
  { key: "calculated", label: runListLabels.tabCalculated, statuses: ["Calculated"] },
  { key: "pending", label: runListLabels.tabPending, statuses: ["PendingApproval"] },
  { key: "approved", label: runListLabels.tabApproved, statuses: ["Approved"] },
  { key: "posted", label: runListLabels.tabPosted, statuses: ["Posted"] },
  { key: "paid", label: runListLabels.tabPaid, statuses: ["Paid"] },
  { key: "reversed", label: runListLabels.tabReversed, statuses: ["Reversed"] },
];

function trendOf(current: number, previous: number, text: string) {
  if (!previous) return undefined;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}% ${text}`, goodDirection: "down" as const };
}

export default function RunsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const { role } = useRole();
  const runs = useApi<RunRow[]>(can("payroll.run", "view") ? "/api/payroll/runs" : null);
  const summary = useApi<Summary>(can("payroll.run", "view") ? "/api/payroll/runs/summary" : null);
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");

  const [tab, setTab] = useState("all");
  const [period, setPeriod] = useState(FILTER_ALL);
  const [profile, setProfile] = useState(FILTER_ALL);

  const profileName = (id: string) => {
    const p = profiles.data?.find((x) => x.id === id);
    return p ? t(p.name) : id;
  };
  const rows: Row[] = useMemo(() => (runs.data ?? []).map((r) => ({ ...r, search: r.runNo })), [runs.data]);
  const periodKeys = [...new Set(rows.map((r) => r.periodKey))].sort().reverse();
  const filtered = rows.filter((r) => {
    const statuses = TABS.find((x) => x.key === tab)?.statuses;
    return (!statuses || statuses.includes(r.status)) && (period === FILTER_ALL || r.periodKey === period) && (profile === FILTER_ALL || r.profileId === profile);
  });
  const counts = Object.fromEntries(TABS.map((x) => [x.key, x.statuses ? rows.filter((r) => x.statuses!.includes(r.status)).length : rows.length]));
  const s = summary.data;

  if (!can("payroll.run", "view")) return <EmptyState title={configCommon.readOnly} />;

  const columns: DataTableColumn<Row>[] = [
    { key: "runNo", header: t(runListLabels.runNo), sortValue: (r) => r.runNo, cell: (r) => <bdi dir="ltr" className="font-mono text-xs font-medium">{r.runNo}</bdi> },
    { key: "period", header: t(runListLabels.period), sortValue: (r) => r.periodKey, cell: (r) => <bdi dir="ltr">{formatPeriod(r.periodKey)}</bdi> },
    { key: "profile", header: t(runListLabels.profile), cell: (r) => profileName(r.profileId) },
    {
      key: "type",
      header: t(runListLabels.type),
      cell: (r) => <StatusBadge tone={r.runType === "Regular" ? "neutral" : "info"} label={t(runTypeLabels[r.runType])} />,
    },
    { key: "employees", header: t(runListLabels.employees), sortValue: (r) => r.employeeCount, cell: (r) => <bdi dir="ltr" className="tabular-nums">{r.employeeCount}</bdi> },
    { key: "gross", header: t(runListLabels.gross), sortValue: (r) => r.grossTotal, cell: (r) => <Amount value={r.grossTotal} /> },
    { key: "net", header: t(runListLabels.net), sortValue: (r) => r.netTotal, cell: (r) => <Amount value={r.netTotal} bold /> },
    {
      key: "alerts",
      header: t(runListLabels.alerts),
      cell: (r) => (
        <div className="flex gap-1">
          {r.blockerCount > 0 && <StatusBadge tone="destructive" label={`${r.blockerCount} ${t(runListLabels.blockers)}`} className="text-[10px]" />}
          {r.warningCount > 0 && <StatusBadge tone="warning" label={`${r.warningCount} ${t(runListLabels.warnings)}`} className="text-[10px]" />}
          {r.blockerCount === 0 && r.warningCount === 0 && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    { key: "status", header: t(runListLabels.status), cell: (r) => <StatusBadge label={t(runStatusLabels[r.status])} tone={runStatusTones[r.status]} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.runs}
        description={{
          ar: "دورات الرواتب: احتساب ← اعتماد ← ترحيل ← دفع، مع إمكانية العكس قبل الدفع",
          en: "Payroll runs: calculate → approve → post → pay, with reversal available before payment",
        }}
        actions={
          can("payroll.run", "create") && (
            <Link href="/payroll/runs/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-4" />
              {t(runListLabels.newRun)}
            </Link>
          )
        }
      />
      {role === "deptHead" && <p className="text-sm text-muted-foreground">{t(runListLabels.deptScope)}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(runListLabels.kpiGross)} value={s ? s.current.gross.toLocaleString("en-US") : "…"} icon={Banknote} description={s ? `${s.current.employees} ${t(runListLabels.employees)}` : undefined} trend={s ? trendOf(s.current.gross, s.previous.gross, t(runListLabels.vsPrevious)) : undefined} />
        <KPICard title={t(runListLabels.kpiNet)} value={s ? s.current.net.toLocaleString("en-US") : "…"} icon={Wallet} tone="success" trend={s ? trendOf(s.current.net, s.previous.net, t(runListLabels.vsPrevious)) : undefined} />
        <KPICard title={t(runListLabels.kpiEmployerCost)} value={s ? s.current.employerCost.toLocaleString("en-US") : "…"} icon={Users} tone="info" trend={s ? trendOf(s.current.employerCost, s.previous.employerCost, t(runListLabels.vsPrevious)) : undefined} />
        <KPICard
          title={t(runListLabels.kpiWaiting)}
          value={s ? s.waiting.total : "…"}
          icon={ClipboardList}
          tone={s && s.waiting.total > 0 ? "warning" : "neutral"}
          description={s ? `${s.waiting.calculated} ${t(runListLabels.tabCalculated)} · ${s.waiting.pendingApproval} ${t(runListLabels.tabPending)} · ${s.waiting.approved} ${t(runListLabels.tabApproved)}` : undefined}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {TABS.map((x) => (
            <TabsTrigger key={x.key} value={x.key}>
              {t(x.label)}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] tabular-nums">{counts[x.key] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        searchPlaceholder={t(runListLabels.searchPlaceholder)}
        loading={runs.loading}
        error={runs.error ? t(commonLabels.loadError) : undefined}
        onRetry={runs.reload}
        emptyMessage={t(runListLabels.empty)}
        onRowClick={(r) => router.push(`/payroll/runs/${r.id}`)}
        filters={
          <>
            <FilterSelect label={t(runListLabels.period)} value={period} onChange={setPeriod} allLabel={t(runListLabels.allPeriods)} options={periodKeys.map((k) => ({ value: k, label: formatPeriod(k) }))} />
            <FilterSelect label={t(runListLabels.profile)} value={profile} onChange={setProfile} allLabel={t(commonLabels.all)} options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))} />
          </>
        }
      />
    </div>
  );
}
