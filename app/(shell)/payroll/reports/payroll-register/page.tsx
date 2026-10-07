"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DraftBanner, downloadCsv, PeriodFilter, PrintStyles, useReportFilters } from "@/components/payroll/report-filters";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { registerLabels as R, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { runStatusLabels, runStatusTones } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";
import type { RunStatus } from "@/lib/payroll/types";

type Totals = { basic: number; allowances: number; grossEarnings: number; attendance: number; statutory: number; tax: number; loans: number; penalties: number; other: number; net: number };
type Row = Totals & { payslipId: string; runId: string; employee: Employee | null };
type Group = { key: string; labelAr: string; labelEn: string; rows: Row[]; totals: Totals };
type Report = { periodKey: string; isDraft: boolean; runs: { id: string; runNo: string; status: RunStatus }[]; groups: Group[]; totals: Totals; count: number; departments: string[] };

const COLUMNS: { key: keyof Totals; label: { ar: string; en: string } }[] = [
  { key: "basic", label: R.basic },
  { key: "allowances", label: R.allowances },
  { key: "grossEarnings", label: R.gross },
  { key: "attendance", label: R.attendance },
  { key: "statutory", label: R.statutory },
  { key: "tax", label: R.tax },
  { key: "loans", label: R.loans },
  { key: "penalties", label: R.penalties },
  { key: "other", label: R.other },
  { key: "net", label: R.net },
];

export default function PayrollRegisterPage() {
  const { locale, t } = useLocale();
  const can = useCan();
  const filters = useReportFilters();
  const [groupBy, setGroupBy] = useState<"department" | "costCenter">("department");
  const [department, setDepartment] = useState(FILTER_ALL);
  const report = useApi<Report>(filters.ready ? `/api/payroll/reports/register?${filters.query(`&groupBy=${groupBy}${department !== FILTER_ALL ? `&department=${encodeURIComponent(department)}` : ""}`)}` : null);
  const r = report.data;
  const name = (e: Employee | null) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");

  if (!can("payroll.report", "view")) return <EmptyState title={configCommon.readOnly} />;

  const exportCsv = () => {
    if (!r) return;
    downloadCsv(
      `payroll-register-${r.periodKey}.csv`,
      ["Employee", "Code", "Group", ...COLUMNS.map((c) => c.label.en)],
      r.groups.flatMap((g) => g.rows.map((row) => [name(row.employee), row.employee?.employeeCode ?? "", g.labelEn, ...COLUMNS.map((c) => row[c.key])]))
    );
  };

  return (
    <div className="space-y-5">
      <PrintStyles />
      <div className="no-print space-y-5">
        <PageHeader
          title={R.title}
          description={R.description}
          actions={
            <>
              {can("payroll.report", "export") && <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!r}>{t(C.exportCsv)}</Button>}
              <Button type="button" size="sm" onClick={() => window.print()} disabled={!r}>
                <Printer className="size-4" />
                {t(C.print)}
              </Button>
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter filters={filters} />
          <FilterSelect label={t(C.groupBy)} value={groupBy} onChange={(v) => setGroupBy(v === "costCenter" ? "costCenter" : "department")} allLabel={t(C.byDepartment)} options={[{ value: "department", label: t(C.byDepartment) }, { value: "costCenter", label: t(C.byCostCentre) }]} />
          <FilterSelect label={t(C.department)} value={department} onChange={setDepartment} allLabel={t(C.allDepartments)} options={(r?.departments ?? []).map((d) => ({ value: d, label: d }))} />
        </div>
        <DraftBanner isDraft={Boolean(r?.isDraft)} />
      </div>

      {report.loading && !r && <p className="py-10 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
      {report.error && <p role="alert" className="text-sm text-destructive">{t(commonLabels.loadError)}</p>}

      {r && (
        <div id="report-print" className="space-y-4 rounded-xl border border-border bg-card p-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t(R.title)}</h2>
              <p className="text-sm text-muted-foreground">
                {t(C.period)}: <bdi dir="ltr" className="font-medium text-foreground">{formatPeriod(r.periodKey)}</bdi> · {r.count} {t(C.employees)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {r.isDraft && <StatusBadge tone="warning" label={t(C.draftBadge)} />}
              {r.runs.map((run) => (
                <Link key={run.id} href={`/payroll/runs/${run.id}`} className="no-print">
                  <StatusBadge tone={runStatusTones[run.status]} label={`${run.runNo} · ${t(runStatusLabels[run.status])}`} />
                </Link>
              ))}
            </div>
          </header>

          {r.count === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t(C.noData)}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-start font-medium">{t(C.employee)}</th>
                    {COLUMNS.map((c) => <th key={c.key} className="px-2 py-2 text-end font-medium">{t(c.label)}</th>)}
                    <th className="px-2 py-2 text-start font-medium">{t(R.signature)}</th>
                  </tr>
                </thead>
                {r.groups.map((g) => (
                  <tbody key={g.key} className="border-t-2 border-border">
                    <tr className="bg-muted/30">
                      <td colSpan={COLUMNS.length + 2} className="px-2 py-1.5 font-semibold">{locale === "ar" ? g.labelAr : g.labelEn}</td>
                    </tr>
                    {g.rows.map((row) => (
                      <tr key={row.payslipId} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <Link href={`/payroll/reports/payslip/${row.payslipId}`} className="font-medium hover:text-primary hover:underline" title={t(R.openPayslip)}>{name(row.employee)}</Link>
                          <span className="block text-[10px] text-muted-foreground"><bdi dir="ltr">{row.employee?.employeeCode}</bdi></span>
                        </td>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className={`px-2 py-1.5 text-end ${c.key === "net" ? "font-semibold" : ""}`}><Amount value={row[c.key]} currency={false} /></td>
                        ))}
                        <td className="px-2 py-1.5"><span className="block h-5 w-20 border-b border-dashed border-muted-foreground/50" /></td>
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-muted/20 font-semibold">
                      <td className="px-2 py-1.5">{t(C.total)} ({g.rows.length})</td>
                      {COLUMNS.map((c) => <td key={c.key} className="px-2 py-1.5 text-end"><Amount value={g.totals[c.key]} currency={false} bold /></td>)}
                      <td />
                    </tr>
                  </tbody>
                ))}
                <tfoot className="border-t-2 border-border bg-primary/5 font-bold">
                  <tr>
                    <td className="px-2 py-2">{t(C.grandTotal)}</td>
                    {COLUMNS.map((c) => <td key={c.key} className="px-2 py-2 text-end"><Amount value={r.totals[c.key]} currency={false} bold /></td>)}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <footer className="grid grid-cols-2 gap-8 pt-6 text-xs text-muted-foreground">
            <div>{t(R.signedBy)}: <span className="inline-block w-40 border-b border-dashed border-muted-foreground/50" /></div>
            <div>{t(R.approvedBy)}: <span className="inline-block w-40 border-b border-dashed border-muted-foreground/50" /></div>
          </footer>
        </div>
      )}
    </div>
  );
}
