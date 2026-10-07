"use client";

import { ArrowLeft, FileDown } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DraftBanner, downloadCsv } from "@/components/payroll/report-filters";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { remittanceLabels as R, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { RemittanceKind, RemittanceRecord } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";

type PeriodRow = { periodKey: string; employeeTotal: number; employerTotal: number; total: number; employees: number; isDraft: boolean; status: RemittanceRecord | null };
type Detail = {
  kind: RemittanceKind;
  periodKey: string;
  isDraft: boolean;
  rows: { payslipId: string; employee: Employee | null; base: number; employeeShare: number; employerShare: number }[];
  employeeTotal: number;
  employerTotal: number;
  total: number;
  consistent: boolean;
  status: RemittanceRecord | null;
  establishmentFileNo: string | null;
};

const TABS: { key: RemittanceKind; label: { ar: string; en: string } }[] = [
  { key: "tax", label: R.tabTax },
  { key: "pension", label: R.tabPension },
  { key: "socialSecurity", label: R.tabSs },
];

function StatusCell({ status, draft }: { status: RemittanceRecord | null; draft?: boolean }) {
  const { t } = useLocale();
  if (draft) return <StatusBadge tone="warning" label={t(R.draft)} />;
  return status?.status === "Remitted" ? (
    <span className="flex items-center gap-1.5">
      <StatusBadge tone="success" label={t(R.remitted)} />
      <bdi dir="ltr" className="font-mono text-[10px] text-muted-foreground">{status.voucherRef}</bdi>
    </span>
  ) : (
    <StatusBadge tone="warning" label={t(R.notRemitted)} />
  );
}

/** Remittance statements of the three authorities (spec §8 screen 5); the official-format export is a placeholder. */
export default function RemittancesPage() {
  const { t } = useLocale();
  const can = useCan();
  const [kind, setKind] = useState<RemittanceKind>("tax");
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const list = useApi<{ periods: PeriodRow[] }>(`/api/payroll/reports/remittances?kind=${kind}`);
  const detail = useApi<Detail>(periodKey ? `/api/payroll/reports/remittances?kind=${kind}&periodKey=${periodKey}` : null);

  if (!can("payroll.report", "view")) return <EmptyState title={configCommon.readOnly} />;
  const shareLabel = kind === "pension" ? R.stateShare : kind === "socialSecurity" ? R.employerOnly : R.employerShare;
  const hasEmployer = kind !== "tax";

  const columns: DataTableColumn<PeriodRow>[] = [
    { key: "period", header: t(R.period), sortValue: (r) => r.periodKey, cell: (r) => <bdi dir="ltr" className="font-medium">{formatPeriod(r.periodKey)}</bdi> },
    { key: "employees", header: t(R.employees), cell: (r) => <bdi dir="ltr">{r.employees}</bdi> },
    { key: "employee", header: t(R.employeeShare), sortValue: (r) => r.employeeTotal, cell: (r) => <Amount value={r.employeeTotal} /> },
    ...(hasEmployer ? [{ key: "employer", header: t(shareLabel), sortValue: (r: PeriodRow) => r.employerTotal, cell: (r: PeriodRow) => <Amount value={r.employerTotal} /> }] : []),
    { key: "total", header: t(R.total), sortValue: (r) => r.total, cell: (r) => <Amount value={r.total} bold /> },
    { key: "status", header: t(R.status), cell: (r) => <StatusCell status={r.status} draft={r.isDraft} /> },
  ];

  const d = detail.data;
  const name = (e: Employee | null) => (e ? e.fullNameEn : "");
  const exportCsv = () => d && downloadCsv(`remittance-${kind}-${d.periodKey}.csv`, ["Employee", "Base", "Employee share", "Employer share"], d.rows.map((r) => [name(r.employee), r.base, r.employeeShare, r.employerShare]));

  return (
    <div className="space-y-5">
      <PageHeader title={payrollNavLabels.remittances} description={R.description} />
      <Tabs value={kind} onValueChange={(v) => { setKind(v as RemittanceKind); setPeriodKey(null); }}>
        <TabsList className="flex-wrap">
          {TABS.map((x) => <TabsTrigger key={x.key} value={x.key}>{t(x.label)}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {!periodKey && (
        <DataTable
          data={list.data?.periods ?? []}
          columns={columns}
          getRowId={(r) => r.periodKey}
          loading={list.loading}
          error={list.error ? t(commonLabels.loadError) : undefined}
          onRetry={list.reload}
          emptyMessage={t(R.empty)}
          onRowClick={(r) => setPeriodKey(r.periodKey)}
        />
      )}

      {periodKey && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPeriodKey(null)}>
              <ArrowLeft className="size-4 rtl:rotate-180" />
              {t(R.back)}
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {d && can("payroll.report", "export") && <Button type="button" variant="outline" size="sm" onClick={exportCsv}>{t(C.exportCsv)}</Button>}
              <span title={t(R.officialHint)}>
                <Button type="button" variant="outline" size="sm" disabled>
                  <FileDown className="size-4" />
                  {t(R.officialExport)}
                </Button>
              </span>
              {d && d.status?.status !== "Remitted" && !d.isDraft && can("payroll.report", "export") && <Button type="button" size="sm" onClick={() => setMarking(d.periodKey)}>{t(R.markRemitted)}</Button>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t(R.officialHint)} — {t(R.officialExport)}</p>
          <DraftBanner isDraft={Boolean(d?.isDraft)} />

          {d && (
            <section className="space-y-4 rounded-xl border border-border bg-card p-4">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{t(TABS.find((x) => x.key === kind)!.label)} — <bdi dir="ltr">{formatPeriod(d.periodKey)}</bdi></h2>
                  {d.establishmentFileNo && <p className="text-xs text-muted-foreground">{t(R.establishment)}: <bdi dir="ltr" className="font-mono">{d.establishmentFileNo}</bdi></p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={d.consistent ? "success" : "destructive"} label={t(d.consistent ? R.consistent : R.inconsistent)} />
                  <StatusCell status={d.status} draft={d.isDraft} />
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">{t(C.employee)}</th>
                      <th className="px-3 py-2 text-end font-medium">{t(R.base)}</th>
                      <th className="px-3 py-2 text-end font-medium">{t(R.employeeShare)}</th>
                      {hasEmployer && <th className="px-3 py-2 text-end font-medium">{t(shareLabel)}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((row) => (
                      <tr key={row.payslipId} className="border-t border-border">
                        <td className="px-3 py-2">{row.employee ? `${row.employee.fullNameAr}` : "—"}<span className="block text-xs text-muted-foreground"><bdi dir="ltr">{row.employee?.employeeCode}</bdi></span></td>
                        <td className="px-3 py-2 text-end"><Amount value={row.base} currency={false} /></td>
                        <td className="px-3 py-2 text-end"><Amount value={row.employeeShare} currency={false} /></td>
                        {hasEmployer && <td className="px-3 py-2 text-end"><Amount value={row.employerShare} currency={false} /></td>}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
                    <tr>
                      <td className="px-3 py-2.5">{t(R.total)} ({d.rows.length})</td>
                      <td />
                      <td className="px-3 py-2.5 text-end"><Amount value={d.employeeTotal} currency={false} bold /></td>
                      {hasEmployer && <td className="px-3 py-2.5 text-end"><Amount value={d.employerTotal} currency={false} bold /></td>}
                    </tr>
                    {hasEmployer && (
                      <tr className="text-primary">
                        <td className="px-3 py-2" colSpan={3}>{t(R.total)}</td>
                        <td className="px-3 py-2 text-end"><Amount value={d.total} bold /></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {marking && (
        <MarkDialog
          periodKey={marking}
          kind={kind}
          onClose={() => setMarking(null)}
          onDone={() => {
            setMarking(null);
            detail.reload();
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function MarkDialog({ periodKey, kind, onClose, onDone }: { periodKey: string; kind: RemittanceKind; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    try {
      await apiFetch("/api/payroll/reports/remittances", { method: "POST", body: { periodKey, kind } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={t(R.markRemitted)}
      description={t(R.markBody)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" onClick={submit} disabled={busy}>{t(R.markRemitted)}</Button>
        </>
      }
    >
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
