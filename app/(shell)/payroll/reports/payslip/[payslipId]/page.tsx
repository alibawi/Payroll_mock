"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DraftBanner, PrintStyles } from "@/components/payroll/report-filters";
import { BrandMark } from "@/components/shell/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { payslipPrintLabels as P, reportCommonLabels as C } from "@/lib/i18n/payroll-report-labels";
import { paymentMethodLabels } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PayrollPeriod, Payslip, PayslipLineRecord } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = {
  payslip: Payslip;
  run: { id: string; runNo: string; status: string; journalRef: string | null };
  isDraft: boolean;
  period: PayrollPeriod | null;
  lines: PayslipLineRecord[];
  employee: Employee | null;
};

/** The printable A4 payslip (spec §8 screen 2): ENKI header, earnings / deductions, attendance and net pay. */
export default function PrintablePayslipPage() {
  const { payslipId } = useParams<{ payslipId: string }>();
  const { locale, t } = useLocale();
  const detail = useApi<Detail>(`/api/payroll/reports/payslip/${payslipId}`);
  const d = detail.data;

  if (detail.error) {
    return (
      <EmptyState title={P.notAvailable} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(C.back)}</Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { payslip: p, employee: e, lines } = d;
  const earnings = lines.filter((l) => l.componentType === "Earning");
  const attendance = lines.filter((l) => l.source === "Attendance" && l.componentType === "Deduction");
  const deductions = lines.filter((l) => l.componentType === "Deduction" && l.source !== "Attendance");
  const contributions = lines.filter((l) => l.componentType === "EmployerContribution");
  const attendanceTotal = p.absenceDeduction + p.latenessDeduction;
  const empName = e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—";

  const table = ({ title, rows, total, negative }: { title: string; rows: { id: string; name: string; code: string; amount: number; remark?: string }[]; total: number; negative?: boolean }) => (
    <section>
      <h3 className="mb-1 border-b border-black/60 pb-1 text-sm font-bold">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-black/10">
              <td className="py-1.5">
                {r.name}
                <span className="block text-[10px] text-muted-foreground"><bdi dir="ltr">{r.code}</bdi>{r.remark ? ` · ${r.remark}` : ""}</span>
              </td>
              <td className="py-1.5 text-end"><Amount value={negative ? -r.amount : r.amount} currency={false} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="pt-2">{t(C.total)}</td>
            <td className="pt-2 text-end"><Amount value={negative ? -total : total} currency={false} bold /></td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
  const rowsOf = (ls: PayslipLineRecord[]) => ls.map((l) => ({ id: l.id, name: t(l.componentName), code: l.componentCode, amount: l.amount, remark: l.remark }));

  return (
    <div className="space-y-5">
      <PrintStyles target="payslip-print" />
      <div className="no-print space-y-4">
        <PageHeader
          title={P.title}
          description={{ ar: `${empName} — ${formatPeriod(p.periodKey)}`, en: `${empName} — ${formatPeriod(p.periodKey)}` }}
          actions={
            <Button type="button" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t(C.print)}
            </Button>
          }
        />
        <DraftBanner isDraft={d.isDraft} />
      </div>

      <article id="payslip-print" className="relative mx-auto w-full max-w-[794px] space-y-5 rounded-xl border border-border bg-white p-8 text-black shadow-sm" style={{ minHeight: 1000 }}>
        {d.isDraft && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl font-black tracking-widest text-black/5 -rotate-12">{t(P.draftWatermark)}</span>}
        <header className="flex items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <BrandMark className="size-14" />
            <div>
              <p className="text-lg font-bold">{t(P.company)}</p>
              <p className="text-xs text-black/60">ENKI ERP — {t(P.title)}</p>
            </div>
          </div>
          <div className="text-end text-sm">
            <p className="font-bold">{t(P.period)}: <bdi dir="ltr">{formatPeriod(p.periodKey)}</bdi></p>
            {d.period && <p className="text-black/70">{t(P.payDate)}: <bdi dir="ltr">{formatDate(d.period.payDate)}</bdi></p>}
            <p className="text-xs text-black/50"><bdi dir="ltr">{d.run.runNo}</bdi></p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          <p><span className="text-black/60">{t(P.employee)}: </span><b>{empName}</b></p>
          <p><span className="text-black/60">{t(P.code)}: </span><bdi dir="ltr">{e?.employeeCode}</bdi></p>
          <p><span className="text-black/60">{t(P.position)}: </span>{e ? (locale === "ar" ? e.position : e.positionEn) : ""}</p>
          <p><span className="text-black/60">{t(P.department)}: </span>{e ? (locale === "ar" ? e.department : e.departmentEn) : ""}</p>
          <p><span className="text-black/60">{t(P.method)}: </span>{t(paymentMethodLabels[p.paymentMethod])}</p>
          <p><span className="text-black/60">{t(P.account)}: </span><bdi dir="ltr" className="font-mono text-xs">{p.bankAccountNo ?? "—"}</bdi></p>
        </section>

        <div className="grid grid-cols-2 gap-6">
          {table({ title: t(P.earnings), rows: rowsOf(earnings), total: p.grossEarnings })}
          <div className="space-y-4">
            {table({ title: t(P.deductions), rows: rowsOf(deductions), total: p.totalEmployeeDeductions, negative: true })}
            {attendance.length > 0 && table({ title: t(P.attendanceDeductions), rows: rowsOf(attendance), total: attendanceTotal, negative: true })}
          </div>
        </div>

        <section className="grid grid-cols-4 gap-3 rounded-lg border border-black/20 p-3 text-center text-xs">
          <div><p className="text-black/60">{t(P.workedDays)}</p><p className="text-base font-bold">{p.workedDays}</p></div>
          <div><p className="text-black/60">{t(P.absence)}</p><p className="text-base font-bold">{p.absenceDays}</p></div>
          <div><p className="text-black/60">{t(P.late)}</p><p className="text-base font-bold">{p.lateMinutes}</p></div>
          <div><p className="text-black/60">{t(P.overtime)}</p><p className="text-base font-bold">{p.overtimeHours}</p></div>
        </section>

        <section className="flex items-center justify-between rounded-lg bg-black px-5 py-3 text-white">
          <div className="text-sm">
            <p>{t(P.gross)}: <Amount value={p.grossEarnings} /> · {t(P.totalDeductions)}: <Amount value={-(p.totalEmployeeDeductions + attendanceTotal)} /></p>
          </div>
          <p className="text-xl font-bold">{t(P.net)}: <Amount value={p.netPay} bold /></p>
        </section>

        {contributions.length > 0 && (
          <p className="text-xs text-black/60">{t(P.employerNote)}: {contributions.map((l) => `${t(l.componentName)} ${l.amount.toLocaleString("en-US")}`).join(" · ")}</p>
        )}
        <footer className="border-t border-black/20 pt-3 text-center text-[11px] text-black/50">{t(P.footer)}</footer>
      </article>
    </div>
  );
}
