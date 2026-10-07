"use client";

import { ChevronDown, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { PayslipLineTable } from "@/components/payroll/payslip-line-table";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  paidStatusLabels,
  paidStatusTones,
  paymentMethodLabels,
  payslipPageLabels,
  runDetailLabels,
  runStatusLabels,
  runStatusTones,
  scheduleSourceLabels,
} from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate, formatNumber } from "@/lib/payroll/format";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PayrollDeductionScheduleItem, PayrollPeriod, Payslip, PayslipLineRecord, RunStatus } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = {
  run: { id: string; runNo: string; status: RunStatus; periodKey: string; runType: string; journalRef: string | null };
  period: PayrollPeriod;
  payslip: Payslip;
  lines: PayslipLineRecord[];
  schedule: PayrollDeductionScheduleItem[];
  employee: Employee | null;
  previous: { periodKey: string; netPay: number; grossPay: number } | null;
};

export default function PayslipPage() {
  const { id, payslipId } = useParams<{ id: string; payslipId: string }>();
  const { locale, t } = useLocale();
  const detail = useApi<Detail>(`/api/payroll/runs/${id}/payslips/${payslipId}`);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (detail.error) {
    return (
      <EmptyState title={payslipPageLabels.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href={`/payroll/runs/${id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(payslipPageLabels.backToRun)}</Link>
      </EmptyState>
    );
  }
  const d = detail.data;
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { payslip: p, run, employee, lines } = d;
  const empName = employee ? (locale === "ar" ? employee.fullNameAr : employee.fullNameEn) : "—";
  const mainLines = lines.filter((l) => l.source !== "Attendance");
  const attendanceLines = lines.filter((l) => l.source === "Attendance" && l.componentType === "Deduction");
  const attendanceTotal = p.absenceDeduction + p.latenessDeduction;
  const allOpen = p.trace.length > 0 && p.trace.every((s) => open[s.step]);
  const net = d.previous ? p.netPay - d.previous.netPay : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: empName, en: empName }}
        description={{
          ar: `قسيمة راتب ${formatPeriod(run.periodKey)} — ${employee?.position ?? ""}`,
          en: `Payslip ${formatPeriod(run.periodKey)} — ${employee?.positionEn ?? ""}`,
        }}
        actions={
          <>
            <StatusBadge label={t(runStatusLabels[run.status])} tone={runStatusTones[run.status]} />
            <StatusBadge label={t(paidStatusLabels[p.paidStatus])} tone={paidStatusTones[p.paidStatus]} />
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t(payslipPageLabels.print)}
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        <Link href={`/payroll/runs/${run.id}`} className="text-primary hover:underline">
          <bdi dir="ltr" className="font-mono">{run.runNo}</bdi> · {t(payslipPageLabels.backToRun)}
        </Link>
        {employee && <> · <bdi dir="ltr">{employee.employeeCode}</bdi> · {locale === "ar" ? employee.department : employee.departmentEn}</>}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(payslipPageLabels.grossEarnings)} value={formatNumber(p.grossEarnings)} tone="neutral" />
        <KPICard title={t(runDetailLabels.deductions)} value={formatNumber(p.totalEmployeeDeductions + attendanceTotal)} tone="warning" description={attendanceTotal ? `${t(payslipPageLabels.attendanceDeductions)}: ${formatNumber(attendanceTotal)}` : undefined} />
        <KPICard
          title={t(runDetailLabels.net)}
          value={formatNumber(p.netPay)}
          tone="success"
          trend={net !== null && d.previous ? { value: net, label: `${net > 0 ? "+" : ""}${formatNumber(net)} ${t(payslipPageLabels.vsPrevious)}` } : undefined}
        />
        <KPICard title={t(runDetailLabels.employerCost)} value={formatNumber(p.employerCost)} tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t({ ar: "بنود القسيمة", en: "Payslip lines" })}>
            <PayslipLineTable lines={mainLines} />
          </DetailSection>

          {attendanceLines.length > 0 && (
            <DetailSection title={t(payslipPageLabels.attendanceDeductions)}>
              <dl className="space-y-2 text-sm">
                {attendanceLines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3">
                    <dt>
                      {t(l.componentName)}
                      <span className="ms-2 text-xs text-muted-foreground">{l.remark ?? ""}</span>
                    </dt>
                    <dd><Amount value={-l.amount} signed /></dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
          )}

          <DetailSection title={t(payslipPageLabels.summary)}>
            <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              <Row label={t(payslipPageLabels.grossEarnings)} value={p.grossEarnings} />
              <Row label={t(payslipPageLabels.attendanceDeductions)} value={-attendanceTotal} signed />
              <Row label={t(payslipPageLabels.grossPay)} value={p.grossPay} />
              <Row label={t(runDetailLabels.deductions)} value={-p.totalEmployeeDeductions} signed />
              <Row label={t(runDetailLabels.net)} value={p.netPay} emphasis />
              <Row label={t(runDetailLabels.employerCost)} value={p.employerCost} />
            </dl>
          </DetailSection>

          <DetailSection
            title={t(payslipPageLabels.trace)}
            actions={
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(Object.fromEntries(p.trace.map((s) => [s.step, !allOpen])))}>
                {t(allOpen ? payslipPageLabels.collapseAll : payslipPageLabels.expandAll)}
              </Button>
            }
          >
            <p className="mb-3 text-xs text-muted-foreground">{t(payslipPageLabels.traceHint)}</p>
            <ol className="space-y-2">
              {p.trace.map((s) => (
                <li key={s.step} className="rounded-lg border border-border">
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start" onClick={() => setOpen((o) => ({ ...o, [s.step]: !o[s.step] }))} aria-expanded={!!open[s.step]}>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary"><bdi dir="ltr">{s.step}</bdi></span>
                      {t(s.title)}
                    </span>
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open[s.step] && "rotate-180")} />
                  </button>
                  {open[s.step] && (
                    <div className="overflow-x-auto border-t border-border">
                      <table className="w-full text-sm">
                        <tbody>
                          {s.rows.map((r, i) => (
                            <tr key={i} className="border-t border-border first:border-t-0">
                              <td className="px-3 py-2">{t(r.label)}</td>
                              <td className="px-3 py-2 text-muted-foreground"><bdi dir="ltr" className="text-xs">{r.formula ?? ""}</bdi></td>
                              <td className="px-3 py-2 text-end">
                                {typeof r.value === "number" ? <MoneyCell value={r.value} currency={false} parens signed /> : <bdi dir="ltr">{r.value}</bdi>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </DetailSection>
        </div>

        <div className="space-y-5">
          <DetailSection title={t(payslipPageLabels.attendance)}>
            <DetailGrid className="sm:grid-cols-2 lg:grid-cols-2">
              <DetailField label={t(payslipPageLabels.workedDays)}>{p.workedDays}</DetailField>
              <DetailField label={t(payslipPageLabels.paidLeave)}>{p.paidLeaveDays}</DetailField>
              <DetailField label={t(payslipPageLabels.unpaidLeave)}>{p.unpaidLeaveDays}</DetailField>
              <DetailField label={t(payslipPageLabels.absence)}>{p.absenceDays}</DetailField>
              <DetailField label={t(payslipPageLabels.lateEvents)}>{p.lateEvents}</DetailField>
              <DetailField label={t(payslipPageLabels.lateMinutes)}>{p.lateMinutes}</DetailField>
              <DetailField label={t(payslipPageLabels.overtime)}>{p.overtimeHours}</DetailField>
              <DetailField label={t(payslipPageLabels.dayRate)}>{p.dayRate > 0 && <MoneyCell value={p.dayRate} />}</DetailField>
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(payslipPageLabels.bases)}>
            <dl className="space-y-2 text-sm">
              {p.pensionableBase > 0 && <BaseRow label={t(payslipPageLabels.pensionableBase)} value={p.pensionableBase} />}
              {p.socialSecurityBase > 0 && <BaseRow label={t(payslipPageLabels.socialSecurityBase)} value={p.socialSecurityBase} />}
              <BaseRow label={t(payslipPageLabels.taxableBase)} value={p.taxableBase} />
              {p.employerContribution > 0 && <BaseRow label={t(payslipPageLabels.employerContribution)} value={p.employerContribution} />}
            </dl>
          </DetailSection>

          <DetailSection title={t(payslipPageLabels.payment)}>
            <DetailGrid className="sm:grid-cols-2 lg:grid-cols-1">
              <DetailField label={t(payslipPageLabels.method)}>{t(paymentMethodLabels[p.paymentMethod])}</DetailField>
              <DetailField label={t(payslipPageLabels.bankAccount)}>{p.bankAccountNo && <bdi dir="ltr" className="font-mono text-xs">{p.bankAccountNo}</bdi>}</DetailField>
              <DetailField label={t(payslipPageLabels.paymentDoc)}>{p.paymentDocRef && <bdi dir="ltr" className="font-mono text-xs">{p.paymentDocRef}</bdi>}</DetailField>
              <DetailField label={t(payslipPageLabels.paidDate)}>{p.paidDate && <bdi dir="ltr">{formatDate(p.paidDate)}</bdi>}</DetailField>
              <DetailField label={t(payslipPageLabels.costCentre)}>{p.costCenterId && <bdi dir="ltr">{p.costCenterId}</bdi>}</DetailField>
              <DetailField label={t(runDetailLabels.journalRef)}>{run.journalRef && <bdi dir="ltr" className="font-mono text-xs">{run.journalRef}</bdi>}</DetailField>
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(payslipPageLabels.deductionSources)}>
            {d.schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(payslipPageLabels.noSources)}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.schedule.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>
                      <bdi dir="ltr" className="font-mono text-xs">{s.sourceRef}</bdi>
                      <span className="ms-2 text-xs text-muted-foreground">{t(scheduleSourceLabels[s.sourceType])}</span>
                    </span>
                    <span className="text-end">
                      <Amount value={s.appliedAmount} />
                      {s.deferredAmount > 0 && <span className="block text-xs text-secondary-orange">{t(runDetailLabels.deferred)}: <Amount value={s.deferredAmount} /></span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {p.netProtectionFlag && (
              <p className="mt-3 text-xs text-secondary-orange">{t(payslipPageLabels.netProtection)}: {t(p.netProtectionFlag === "Blocked" ? runDetailLabels.blocked : runDetailLabels.spread)}</p>
            )}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, signed, emphasis }: { label: string; value: number; signed?: boolean; emphasis?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 bg-card px-4 py-3", emphasis && "bg-primary/5")}>
      <dt className={cn("text-sm text-muted-foreground", emphasis && "font-semibold text-foreground")}>{label}</dt>
      <dd className={cn(emphasis ? "text-lg font-bold" : "font-semibold")}>
        <Amount value={value} signed={signed} />
      </dd>
    </div>
  );
}

function BaseRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd><Amount value={value} /></dd>
    </div>
  );
}
