"use client";

import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FilterSelect } from "@/components/filter-select";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DetailSection } from "@/components/payroll/detail-section";
import { DraftBanner, PeriodFilter, useReportFilters } from "@/components/payroll/report-filters";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { employerCostLabels as E, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import { useCan, useCanSeeAmounts } from "@/lib/payroll/use-can";

type Row = { key: string; labelAr: string; labelEn: string; employees: number; gross: number; employerContribution: number; employerCost: number };
type Report = {
  periodKey: string;
  isDraft: boolean;
  rows: Row[];
  totals: { employees: number; gross: number; employerContribution: number; employerCost: number };
  series: { periodKey: string; employerCost: number; employees: number }[];
};

/** Employer cost (gross earnings + employer contributions) by department or cost centre, with a 12-month trend. */
export default function EmployerCostPage() {
  const { locale, t } = useLocale();
  const can = useCan();
  const seeAmounts = useCanSeeAmounts();
  const filters = useReportFilters(false);
  const [groupBy, setGroupBy] = useState<"department" | "costCenter">("department");
  const report = useApi<Report>(filters.ready ? `/api/payroll/reports/employer-cost?${filters.query(`&groupBy=${groupBy}`)}` : null);
  const r = report.data;

  if (!can("payroll.report", "view")) return <EmptyState title={configCommon.readOnly} />;
  const max = Math.max(1, ...(r?.series.map((s) => s.employerCost) ?? [1]));

  return (
    <div className="space-y-5">
      <PageHeader title={E.title} description={E.description} />
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter filters={filters} showProfile={false} />
        <FilterSelect label={t(C.groupBy)} value={groupBy} onChange={(v) => setGroupBy(v === "costCenter" ? "costCenter" : "department")} allLabel={t(C.byDepartment)} options={[{ value: "department", label: t(C.byDepartment) }, { value: "costCenter", label: t(C.byCostCentre) }]} />
      </div>
      <DraftBanner isDraft={Boolean(r?.isDraft)} />

      {r && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DetailSection title={t(E.byGroup)} className="lg:col-span-2">
            {r.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(C.noData)}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-start font-medium">{t(groupBy === "department" ? C.department : C.byCostCentre)}</th>
                      <th className="px-2 py-2 text-end font-medium">{t(C.employees)}</th>
                      <th className="px-2 py-2 text-end font-medium">{t(E.gross)}</th>
                      <th className="px-2 py-2 text-end font-medium">{t(E.contribution)}</th>
                      <th className="px-2 py-2 text-end font-medium">{t(E.cost)}</th>
                      <th className="w-40 px-2 py-2 text-start font-medium">{t(E.share)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((row) => {
                      const pct = r.totals.employerCost ? (row.employerCost / r.totals.employerCost) * 100 : 0;
                      return (
                        <tr key={row.key} className="border-t border-border">
                          <td className="px-2 py-2.5 font-medium">{locale === "ar" ? row.labelAr : row.labelEn}</td>
                          <td className="px-2 py-2.5 text-end tabular-nums"><bdi dir="ltr">{row.employees}</bdi></td>
                          <td className="px-2 py-2.5 text-end"><Amount value={row.gross} currency={false} /></td>
                          <td className="px-2 py-2.5 text-end"><Amount value={row.employerContribution} currency={false} /></td>
                          <td className="px-2 py-2.5 text-end"><Amount value={row.employerCost} currency={false} bold /></td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                              <span dir="ltr" className="w-10 text-end text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
                    <tr>
                      <td className="px-2 py-2.5">{t(C.total)}</td>
                      <td className="px-2 py-2.5 text-end tabular-nums"><bdi dir="ltr">{r.totals.employees}</bdi></td>
                      <td className="px-2 py-2.5 text-end"><Amount value={r.totals.gross} currency={false} bold /></td>
                      <td className="px-2 py-2.5 text-end"><Amount value={r.totals.employerContribution} currency={false} bold /></td>
                      <td className="px-2 py-2.5 text-end"><Amount value={r.totals.employerCost} currency={false} bold /></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title={t(E.trend)}>
            {seeAmounts ? (
              <div className="flex h-48 items-end gap-1.5" role="img" aria-label={t(E.trend)}>
                {r.series.map((s) => (
                  <div key={s.periodKey} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div className={`w-full rounded-t ${s.periodKey === r.periodKey ? "bg-primary" : "bg-tile-indigo/35"}`} style={{ height: `${(s.employerCost / max) * 100}%` }} title={`${formatPeriod(s.periodKey)}: ${s.employerCost.toLocaleString("en-US")}`} />
                    </div>
                    <span dir="ltr" className="text-[9px] text-muted-foreground">{s.periodKey.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">••••••</p>
            )}
          </DetailSection>
        </div>
      )}
    </div>
  );
}
