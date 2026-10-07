"use client";

import { Landmark, TriangleAlert, Users, Wallet } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DraftBanner, downloadCsv, PeriodFilter, useReportFilters } from "@/components/payroll/report-filters";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { bankLabels as B, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { paidStatusLabels, paidStatusTones } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { useCan } from "@/lib/payroll/use-can";
import type { PaidStatus } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Row = { payslipId: string; employee: Employee | null; bankAccountNo: string | null; netPay: number; paidStatus: PaidStatus; costCenterId: string | null; search: string };
type Report = { periodKey: string; isDraft: boolean; rows: Omit<Row, "search">[]; missingAccount: number; total: number; cashExcluded: number };

/** Bank transfer file (T-3): Bank-paid employees only, with a CSV export of what is on screen. */
export default function BankTransferPage() {
  const { locale, t } = useLocale();
  const can = useCan();
  const filters = useReportFilters();
  const report = useApi<Report>(filters.ready ? `/api/payroll/reports/bank-transfer?${filters.query()}` : null);
  const [downloaded, setDownloaded] = useState(false);
  const r = report.data;
  const name = (e: Employee | null) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");

  if (!can("payroll.report", "view")) return <EmptyState title={configCommon.readOnly} />;
  const rows: Row[] = (r?.rows ?? []).map((x) => ({ ...x, search: `${x.employee?.fullNameAr ?? ""} ${x.employee?.fullNameEn ?? ""} ${x.bankAccountNo ?? ""}` }));

  const columns: DataTableColumn<Row>[] = [
    { key: "employee", header: t(C.employee), sortValue: (x) => name(x.employee), cell: (x) => (<div><div className="font-medium">{name(x.employee)}</div><div className="text-xs text-muted-foreground"><bdi dir="ltr">{x.employee?.employeeCode}</bdi></div></div>) },
    { key: "account", header: t(B.account), cell: (x) => (x.bankAccountNo ? <bdi dir="ltr" className="font-mono text-xs">{x.bankAccountNo}</bdi> : <StatusBadge tone="destructive" label={t(B.noAccount)} />) },
    { key: "amount", header: t(B.amount), sortValue: (x) => x.netPay, cell: (x) => <Amount value={x.netPay} bold /> },
    { key: "paid", header: t(B.paid), cell: (x) => <StatusBadge label={t(paidStatusLabels[x.paidStatus])} tone={paidStatusTones[x.paidStatus]} /> },
  ];

  const exportCsv = () => {
    if (!r) return;
    downloadCsv(`bank-transfer-${r.periodKey}.csv`, ["Employee", "Account", "Net pay"], r.rows.filter((x) => x.bankAccountNo).map((x) => [name(x.employee), x.bankAccountNo ?? "", x.netPay]));
    setDownloaded(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={B.title}
        description={B.description}
        actions={can("payroll.report", "export") && <Button type="button" size="sm" onClick={exportCsv} disabled={!r || r.rows.length === 0}>{t(C.exportCsv)}</Button>}
      />
      <PeriodFilter filters={filters} />
      <DraftBanner isDraft={Boolean(r?.isDraft)} />
      {r && r.missingAccount > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>{t(B.missingAlert)} — {r.missingAccount} {t(B.missing)}</span>
        </div>
      )}
      {downloaded && <p className="text-xs text-secondary-green">{t(B.csvDone)}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard title={t(B.count)} value={r ? r.rows.length : "…"} icon={Users} />
        <KPICard title={t(C.total)} value={r ? r.total.toLocaleString("en-US") : "…"} icon={Wallet} tone="success" />
        <KPICard title={t(B.cashExcluded)} value={r ? r.cashExcluded : "…"} icon={Landmark} tone="neutral" />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(x) => x.payslipId}
        searchKeys={["search"]}
        searchPlaceholder={t({ ar: "بحث بالموظف أو الحساب", en: "Search by employee or account" })}
        loading={report.loading}
        error={report.error ? t(commonLabels.loadError) : undefined}
        onRetry={report.reload}
        emptyMessage={t(C.noData)}
        pageSize={15}
        footer={rows.length ? (<><td className="px-3 py-2.5 font-semibold" colSpan={2}>{t(C.total)}</td><td className="px-3 py-2.5"><Amount value={r?.total ?? 0} bold /></td><td /></>) : undefined}
      />
    </div>
  );
}
