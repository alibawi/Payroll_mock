"use client";

import { CalendarClock, Layers, Users } from "lucide-react";
import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { StatusBadge } from "@/components/status-badge";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { deferredLabels as D, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { runStatusLabels, runStatusTones, scheduleSourceLabels } from "@/lib/i18n/payroll-run-labels";
import { useApi, } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PayrollDeductionScheduleItem, RunStatus } from "@/lib/payroll/types";
import { useCan, useCanSeeAmounts } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";

type Row = PayrollDeductionScheduleItem & { employee: Employee | null; runNo: string; runStatus: RunStatus };

/** Net-protection report (study 3.4): the part of the deductions the monthly cap pushed to later months. */
export default function DeferredDeductionsPage() {
  const { locale, t } = useLocale();
  const can = useCan();
  const seeAmounts = useCanSeeAmounts();
  const report = useApi<{ rows: Row[]; totalDeferred: number; employees: number }>("/api/payroll/reports/deferred-deductions");
  const r = report.data;
  const name = (e: Employee | null) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");

  if (!can("payroll.report", "view")) return <EmptyState title={configCommon.readOnly} />;

  const columns: DataTableColumn<Row>[] = [
    { key: "employee", header: t(C.employee), sortValue: (x) => name(x.employee), cell: (x) => (<div><div className="font-medium">{name(x.employee)}</div><div className="text-xs text-muted-foreground"><bdi dir="ltr">{x.employee?.employeeCode}</bdi></div></div>) },
    { key: "period", header: t(D.period), sortValue: (x) => x.periodKey, cell: (x) => <bdi dir="ltr">{formatPeriod(x.periodKey)}</bdi> },
    { key: "source", header: t(D.source), cell: (x) => t(scheduleSourceLabels[x.sourceType]) },
    { key: "ref", header: t(D.reference), cell: (x) => <bdi dir="ltr" className="font-mono text-xs">{x.sourceRef}</bdi> },
    { key: "due", header: t(D.due), sortValue: (x) => x.amount, cell: (x) => <Amount value={x.amount} /> },
    { key: "applied", header: t(D.applied), cell: (x) => <Amount value={x.appliedAmount} /> },
    { key: "deferred", header: t(D.deferred), sortValue: (x) => x.deferredAmount, cell: (x) => <span className="text-secondary-orange"><Amount value={x.deferredAmount} bold /></span> },
    {
      key: "run",
      header: t(D.run),
      cell: (x) => (
        <Link href={`/payroll/runs/${x.runId}`} className="flex items-center gap-1.5 hover:underline">
          <bdi dir="ltr" className="font-mono text-xs">{x.runNo}</bdi>
          <StatusBadge tone={runStatusTones[x.runStatus]} label={t(runStatusLabels[x.runStatus])} className="text-[10px]" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={D.title} description={D.description} />
      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard title={t(D.kpiTotal)} value={r ? (seeAmounts ? r.totalDeferred.toLocaleString("en-US") : "••••••") : "…"} icon={CalendarClock} tone={r && r.totalDeferred > 0 ? "warning" : "neutral"} />
        <KPICard title={t(D.kpiEmployees)} value={r ? r.employees : "…"} icon={Users} />
        <KPICard title={t(D.kpiItems)} value={r ? r.rows.length : "…"} icon={Layers} />
      </div>
      <DataTable
        data={r?.rows ?? []}
        columns={columns}
        getRowId={(x) => x.id}
        loading={report.loading}
        error={report.error ? t(commonLabels.loadError) : undefined}
        onRetry={report.reload}
        emptyMessage={t(D.empty)}
      />
    </div>
  );
}
