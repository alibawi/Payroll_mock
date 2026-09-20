"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { MoneyCell } from "@/components/payroll/money-cell";
import { StatusBadge } from "@/components/status-badge";
import { journalLabels } from "@/lib/i18n/payroll-labels";
import type { JournalLine } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

/**
 * Journal entry preview (debit / credit table with totals and a balance check).
 * Used before posting a payroll run, a loan disbursement or an end-of-service payout —
 * nothing is sent to Finance (docs/roadmap.md 1).
 */
export function JournalPreview({
  lines,
  reference,
  showCostCenter = false,
  className,
}: {
  lines: JournalLine[];
  /** Document reference shown in the header (e.g. JV-PAYRUN-0007). */
  reference?: string;
  showCostCenter?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  // Amounts are whole dinars, but guard against floating-point noise.
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = difference === 0;
  const colSpan = showCostCenter ? 3 : 2;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t(journalLabels.title)}</h3>
        <div className="flex items-center gap-2">
          {reference && (
            <span className="text-xs text-muted-foreground">
              {t(journalLabels.reference)}: <span dir="ltr">{reference}</span>
            </span>
          )}
          <StatusBadge
            tone={balanced ? "success" : "destructive"}
            label={balanced ? t(journalLabels.balanced) : t(journalLabels.unbalanced)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-start font-medium">{t(journalLabels.account)}</th>
              <th className="px-3 py-2.5 text-start font-medium">{t(journalLabels.description)}</th>
              {showCostCenter && (
                <th className="px-3 py-2.5 text-start font-medium">{t(journalLabels.costCenter)}</th>
              )}
              <th className="px-3 py-2.5 text-end font-medium">{t(journalLabels.debit)}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t(journalLabels.credit)}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <span className="block font-medium text-foreground">{t(line.accountName)}</span>
                  <span className="block text-xs text-muted-foreground">
                    <bdi dir="ltr">{line.accountCode}</bdi>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{line.memo ?? "—"}</td>
                {showCostCenter && (
                  <td className="px-3 py-2.5 text-muted-foreground">{line.costCenter ?? "—"}</td>
                )}
                <td className="px-3 py-2.5 text-end">
                  {line.debit ? <MoneyCell value={line.debit} currency={false} /> : "—"}
                </td>
                <td className="px-3 py-2.5 text-end">
                  {line.credit ? <MoneyCell value={line.credit} currency={false} /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
            <tr>
              <td colSpan={colSpan} className="px-3 py-2.5">
                {t(journalLabels.total)}
              </td>
              <td className="px-3 py-2.5 text-end">
                <MoneyCell value={totalDebit} currency={false} bold />
              </td>
              <td className="px-3 py-2.5 text-end">
                <MoneyCell value={totalCredit} currency={false} bold />
              </td>
            </tr>
            {!balanced && (
              <tr className="text-destructive">
                <td colSpan={colSpan + 1} className="px-3 py-2 text-end">
                  {t(journalLabels.difference)}
                </td>
                <td className="px-3 py-2 text-end">
                  <MoneyCell value={difference} currency={false} />
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {balanced ? (
          <CheckCircle2 className="size-3.5 text-secondary-green" />
        ) : (
          <XCircle className="size-3.5 text-destructive" />
        )}
        <Info className="size-3.5" />
        {t(journalLabels.previewNotice)}
      </p>
    </section>
  );
}
