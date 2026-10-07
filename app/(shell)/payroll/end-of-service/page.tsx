"use client";

import { CircleCheck, Hourglass, Plus, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { eosLabels as L, eosReasonLabels, eosStatusLabels, eosStatusTones } from "@/lib/i18n/payroll-report-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import type { EndOfServiceCalculation, EosStatus } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Row = EndOfServiceCalculation & { employee: Employee | null; search: string };

const TABS: { key: string; label: { ar: string; en: string }; status: EosStatus | null }[] = [
  { key: "all", label: L.tabAll, status: null },
  { key: "draft", label: eosStatusLabels.Draft, status: "Draft" },
  { key: "approved", label: eosStatusLabels.Approved, status: "Approved" },
  { key: "paid", label: eosStatusLabels.Paid, status: "Paid" },
  { key: "cancelled", label: eosStatusLabels.Cancelled, status: "Cancelled" },
];

export default function EndOfServicePage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const claims = useApi<(EndOfServiceCalculation & { employee: Employee | null })[]>(can("payroll.eos", "view") ? "/api/payroll/end-of-service" : null);
  const [tab, setTab] = useState("all");
  const [reason, setReason] = useState(FILTER_ALL);

  const name = (e: Employee | null) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");
  const rows: Row[] = useMemo(() => (claims.data ?? []).map((c) => ({ ...c, search: `${c.eosNo} ${c.employee?.fullNameAr ?? ""} ${c.employee?.fullNameEn ?? ""}` })), [claims.data]);
  const filtered = rows.filter((r) => {
    const status = TABS.find((x) => x.key === tab)?.status;
    return (!status || r.status === status) && (reason === FILTER_ALL || r.terminationReason === reason);
  });
  const counts = Object.fromEntries(TABS.map((x) => [x.key, x.status ? rows.filter((r) => r.status === x.status).length : rows.length]));
  const open = rows.filter((r) => r.status === "Draft" || r.status === "Approved");

  if (!can("payroll.eos", "view")) return <EmptyState title={configCommon.readOnly} />;

  const columns: DataTableColumn<Row>[] = [
    { key: "no", header: t(L.eosNo), sortValue: (r) => r.eosNo, cell: (r) => <bdi dir="ltr" className="font-mono text-xs font-medium">{r.eosNo}</bdi> },
    { key: "employee", header: t(L.employee), sortValue: (r) => name(r.employee), cell: (r) => (<div><div className="font-medium">{name(r.employee)}</div><div className="text-xs text-muted-foreground"><bdi dir="ltr">{r.employee?.employeeCode}</bdi></div></div>) },
    { key: "date", header: t(L.date), sortValue: (r) => r.terminationDate, cell: (r) => <bdi dir="ltr">{formatDate(r.terminationDate)}</bdi> },
    { key: "reason", header: t(L.reason), cell: (r) => t(eosReasonLabels[r.terminationReason]) },
    { key: "years", header: t(L.years), sortValue: (r) => r.serviceYears, cell: (r) => <bdi dir="ltr">{r.serviceYears}</bdi> },
    { key: "total", header: t(L.total), sortValue: (r) => r.totalAmount, cell: (r) => <Amount value={r.totalAmount} bold /> },
    { key: "status", header: t(L.status), cell: (r) => <StatusBadge label={t(eosStatusLabels[r.status])} tone={eosStatusTones[r.status]} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={L.title}
        description={L.description}
        actions={can("payroll.eos", "create") && (
          <Link href="/payroll/end-of-service/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" />
            {t(L.newClaim)}
          </Link>
        )}
      />
      <p className="text-xs text-muted-foreground">{t(L.govNote)}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard title={t(L.kpiOpen)} value={claims.data ? open.length : "…"} icon={Hourglass} tone={open.length > 0 ? "warning" : "neutral"} />
        <KPICard title={t(L.kpiOpenAmount)} value={claims.data ? open.reduce((s, r) => s + r.totalAmount, 0).toLocaleString("en-US") : "…"} icon={UserMinus} />
        <KPICard title={t(L.kpiPaid)} value={claims.data ? rows.filter((r) => r.status === "Paid").length : "…"} icon={CircleCheck} tone="success" />
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
        searchPlaceholder={t(L.searchPlaceholder)}
        loading={claims.loading}
        error={claims.error ? t(commonLabels.loadError) : undefined}
        onRetry={claims.reload}
        emptyMessage={t(L.empty)}
        onRowClick={(r) => router.push(`/payroll/end-of-service/${r.id}`)}
        filters={<FilterSelect label={t(L.reason)} value={reason} onChange={setReason} allLabel={t(commonLabels.all)} options={Object.entries(eosReasonLabels).map(([value, label]) => ({ value, label: t(label) }))} />}
      />
    </div>
  );
}
