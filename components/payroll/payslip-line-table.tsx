"use client";

import { useLocale } from "@/components/locale-provider";
import { MoneyCell } from "@/components/payroll/money-cell";
import { StatusBadge } from "@/components/status-badge";
import { payslipLabels, payslipSourceLabels } from "@/lib/i18n/payroll-labels";
import { formatNumber, formatPercent } from "@/lib/payroll/format";
import type { ComponentType, PayslipLine } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

const sections: { type: ComponentType; label: keyof typeof payslipLabels; tone: string }[] = [
  { type: "Earning", label: "earnings", tone: "text-secondary-green" },
  { type: "Deduction", label: "deductions", tone: "text-destructive" },
  { type: "EmployerContribution", label: "employerContributions", tone: "text-tile-indigo" },
  { type: "Informational", label: "informational", tone: "text-muted-foreground" },
];

export type PayslipSummary = {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  employerCost?: number;
};

/**
 * Payslip body: lines grouped into earnings / deductions / employer contributions (each with a
 * subtotal) plus an optional summary block. `rate` is a percentage (5 = 5%).
 */
export function PayslipLineTable({
  lines,
  summary,
  showBase = true,
  showSource = true,
  className,
}: {
  lines: PayslipLine[];
  summary?: PayslipSummary;
  showBase?: boolean;
  showSource?: boolean;
  className?: string;
}) {
  const { t } = useLocale();

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(payslipLabels.noLines)}</p>;
  }

  return (
    <div className={cn("space-y-5", className)}>
      {sections.map(({ type, label, tone }) => {
        const sectionLines = lines.filter((line) => line.componentType === type);
        if (sectionLines.length === 0) return null;
        const subtotal = sectionLines.reduce((sum, line) => sum + line.amount, 0);
        const columns = 3 + (showBase ? 3 : 0) + (showSource ? 1 : 0);

        return (
          <section key={type} className="space-y-2">
            <h3 className={cn("text-sm font-semibold", tone)}>{t(payslipLabels[label])}</h3>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t(payslipLabels.component)}</th>
                    {showBase && (
                      <>
                        <th className="px-3 py-2 text-end font-medium">{t(payslipLabels.base)}</th>
                        <th className="px-3 py-2 text-end font-medium">{t(payslipLabels.rate)}</th>
                        <th className="px-3 py-2 text-end font-medium">{t(payslipLabels.quantity)}</th>
                      </>
                    )}
                    {showSource && (
                      <th className="px-3 py-2 text-start font-medium">{t(payslipLabels.source)}</th>
                    )}
                    <th className="px-3 py-2 text-end font-medium">{t(payslipLabels.amount)}</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionLines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-3 py-2.5">
                        <span className="block font-medium text-foreground">
                          {t(line.componentName)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          <bdi dir="ltr">{line.componentCode}</bdi>
                          {line.remark ? ` · ${line.remark}` : ""}
                        </span>
                      </td>
                      {showBase && (
                        <>
                          <td className="px-3 py-2.5 text-end text-muted-foreground">
                            {line.base !== undefined ? <MoneyCell value={line.base} currency={false} /> : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-end text-muted-foreground">
                            {line.rate !== undefined ? (
                              <span dir="ltr" className="tabular-nums">
                                {formatPercent(line.rate)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-end text-muted-foreground">
                            {line.quantity !== undefined ? (
                              <span dir="ltr" className="tabular-nums">
                                {formatNumber(line.quantity)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </>
                      )}
                      {showSource && (
                        <td className="px-3 py-2.5">
                          {line.source ? (
                            <StatusBadge tone="neutral" label={t(payslipSourceLabels[line.source])} />
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-end">
                        <MoneyCell value={line.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
                  <tr>
                    <td colSpan={columns - 1} className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-end">
                      <MoneyCell value={subtotal} bold />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        );
      })}

      {summary && (
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <SummaryItem label={t(payslipLabels.grossPay)} value={summary.grossPay} />
          <SummaryItem label={t(payslipLabels.totalDeductions)} value={-summary.totalDeductions} signed />
          <SummaryItem label={t(payslipLabels.netPay)} value={summary.netPay} emphasis />
          {summary.employerCost !== undefined && (
            <SummaryItem label={t(payslipLabels.employerCost)} value={summary.employerCost} />
          )}
        </dl>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  signed,
  emphasis,
}: {
  label: string;
  value: number;
  signed?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 bg-card px-4 py-3", emphasis && "bg-primary/5")}>
      <dt className={cn("text-sm text-muted-foreground", emphasis && "font-semibold text-foreground")}>
        {label}
      </dt>
      <dd className={cn(emphasis ? "text-lg font-bold" : "font-semibold")}>
        <MoneyCell value={value} signed={signed} />
      </dd>
    </div>
  );
}
