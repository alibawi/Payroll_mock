"use client";

import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { MoneyCell } from "@/components/payroll/money-cell";
import { useRole } from "@/components/role-provider";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  penaltyDetailLabels,
  penaltyListLabels,
  penaltyStatusLabels,
  penaltyTypeLabels,
  registerLabels,
} from "@/lib/i18n/payroll-penalty-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { canSeeAmounts } from "@/lib/payroll/permissions";
import type { PenaltyRow } from "@/lib/payroll/types";

/**
 * Statutory penalties register (Discipline Law 14/1991, Labour Law 37/2015): approved penalties with their decision,
 * printable. Only the register block prints (the shell is hidden by the print rules below).
 */
export default function PenaltyRegisterPage() {
  const { locale, t } = useLocale();
  const { role } = useRole();
  const penalties = useApi<PenaltyRow[]>("/api/payroll/penalties");
  const [exported, setExported] = useState(false);

  const rows = useMemo(
    () =>
      (penalties.data ?? [])
        .filter((p) => p.status !== "Draft" && p.status !== "Cancelled")
        .sort((a, b) => a.decisionDate.localeCompare(b.decisionDate)),
    [penalties.data]
  );
  const total = rows.reduce((sum, r) => sum + r.computedAmount, 0);
  const amounts = canSeeAmounts(role);
  const today = new Date().toISOString().slice(0, 10);
  const name = (e: PenaltyRow["employee"]) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");

  return (
    <div className="space-y-5">
      <style>{`@media print { body * { visibility: hidden; } #penalty-register, #penalty-register * { visibility: visible; } #penalty-register { position: absolute; inset: 0; padding: 16px; } .no-print { display: none !important; } }`}</style>

      <div className="no-print">
        <PageHeader
          title={registerLabels.title}
          description={registerLabels.description}
          actions={
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => { setExported(true); setTimeout(() => setExported(false), 2500); }}>
                <Download className="size-4" />
                {exported ? t(registerLabels.exported) : t(registerLabels.export)}
              </Button>
              <Button type="button" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" />
                {t(registerLabels.print)}
              </Button>
            </>
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">{t(registerLabels.onlyApproved)}</p>
      </div>

      <section id="penalty-register" className="space-y-4 rounded-xl border border-border bg-card p-5">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold">{t(registerLabels.title)}</h2>
            <p className="text-xs text-muted-foreground">ENKI ERP · {t(registerLabels.year)} <bdi dir="ltr">2026</bdi></p>
          </div>
          <p className="text-xs text-muted-foreground">{t(registerLabels.generatedOn)} <bdi dir="ltr">{formatDate(today)}</bdi></p>
        </header>

        {penalties.loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">#</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyListLabels.penaltyNo)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyListLabels.employee)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyListLabels.type)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyDetailLabels.decisionRef)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyDetailLabels.decisionDate)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyDetailLabels.reason)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyListLabels.amount)}</th>
                  <th className="px-2 py-2 text-start font-medium">{t(penaltyListLabels.status)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border align-top">
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2"><bdi dir="ltr" className="font-mono text-xs">{r.penaltyNo}</bdi></td>
                    <td className="px-2 py-2">{name(r.employee)}</td>
                    <td className="px-2 py-2">{t(penaltyTypeLabels[r.penaltyType])}</td>
                    <td className="px-2 py-2"><bdi dir="ltr" className="font-mono text-xs">{r.decisionRef}</bdi></td>
                    <td className="px-2 py-2"><bdi dir="ltr">{formatDate(r.decisionDate)}</bdi></td>
                    <td className="px-2 py-2 text-muted-foreground">{r.reason}</td>
                    <td className="px-2 py-2">{amounts ? <MoneyCell value={r.computedAmount} /> : "••••••"}</td>
                    <td className="px-2 py-2">{t(penaltyStatusLabels[r.status])}</td>
                  </tr>
                ))}
              </tbody>
              {amounts && rows.length > 0 && (
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={7} className="px-2 py-2 text-end">{t(registerLabels.total)}</td>
                    <td className="px-2 py-2"><MoneyCell value={total} bold /></td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <footer className="flex justify-end pt-8 text-xs text-muted-foreground">
          <div className="w-56 border-t border-border pt-1 text-center">{t(registerLabels.signature)}</div>
        </footer>
      </section>
    </div>
  );
}
