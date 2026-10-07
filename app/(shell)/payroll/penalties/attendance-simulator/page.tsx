"use client";

import { FlaskConical } from "lucide-react";
import { useMemo, useState } from "react";

import { EmployeeSelect } from "@/components/employee-select";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { OptionSelect } from "@/components/payroll/option-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { simulatorLabels } from "@/lib/i18n/payroll-penalty-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { LatenessResult } from "@/lib/payroll/attendance";
import { computePenaltyAmount, planSpread } from "@/lib/payroll/netProtection";
import { formatPeriod } from "@/lib/payroll/periods";
import type { AttendancePenaltyPolicy, AttendanceSummary, LocalizedText } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Simulation = {
  employee: Employee;
  summary: AttendanceSummary;
  profile: { code: string; name: LocalizedText; dayRateBasis: "WorkingDays" | "CalendarDays" };
  policy: AttendancePenaltyPolicy;
  basis: number;
  basisComponents: { code: string; name: LocalizedText; amount: number }[];
  dayRate: number;
  absence: { days: number; amount: number };
  lateness: LatenessResult;
  grossBefore: number;
  grossAfter: number;
  cap: { percent: number; amount: number; othersDue: number };
};

const PERIODS = ["2026-09", "2026-08"];

/** Step-by-step absence / lateness deduction for one employee and period, plus a penalty what-if under the cap. */
export default function AttendanceSimulatorPage() {
  const { t } = useLocale();
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("2026-09");
  const employees = useApi<Employee[]>("/api/hr/employees?status=active,on_leave");
  const sim = useApi<Simulation>(employeeId ? `/api/payroll/attendance/simulate?employeeId=${employeeId}&period=${period}` : null);
  const s = sim.data;

  const whatIf = useMemo(() => {
    if (!s) return null;
    const basis = { dayRate: s.dayRate, monthlyBasic: s.basis };
    const capacityOf = () => s.cap.amount;
    const make = (type: "DaysOfPay" | "OneMonthSalary", value: number | null) => {
      const amount = computePenaltyAmount(type, value, basis);
      const plan = planSpread({ amount, type, requestedMonths: 1, startPeriodId: "2026-11", capacityOf, action: "AutoSpread" });
      return { amount, plan };
    };
    return { five: make("DaysOfPay", 5), month: make("OneMonthSalary", null) };
  }, [s]);

  return (
    <div className="space-y-5">
      <PageHeader title={simulatorLabels.title} description={simulatorLabels.description} />

      <DetailSection
        title={t({ ar: "الاختيار", en: "Selection" })}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => { setEmployeeId("emp-011"); setPeriod("2026-09"); }}>
            <FlaskConical className="size-4" />
            {t(simulatorLabels.loadGolden)}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t(simulatorLabels.employee)}>
            <EmployeeSelect value={employeeId} onValueChange={setEmployeeId} employees={employees.data ?? []} />
          </FormField>
          <FormField label={t(simulatorLabels.period)}>
            <OptionSelect value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: formatPeriod(p) }))} />
          </FormField>
        </div>
      </DetailSection>

      {sim.loading && <p className="py-8 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
      {sim.error && <p className="py-8 text-center text-sm text-muted-foreground">{t(simulatorLabels.noData)}</p>}

      {s && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailSection title={t(simulatorLabels.step1)}>
              <dl className="space-y-2 text-sm">
                {s.basisComponents.map((c) => (
                  <div key={c.code} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t(c.name)}</dt>
                    <dd><MoneyCell value={c.amount} /></dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-border pt-2">
                  <dt>{t(simulatorLabels.basis)}</dt>
                  <dd><MoneyCell value={s.basis} bold /></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t(simulatorLabels.divisor)} ({t(s.profile.dayRateBasis === "WorkingDays" ? simulatorLabels.workingDays : simulatorLabels.calendarDays)})</dt>
                  <dd><bdi dir="ltr">{s.profile.dayRateBasis === "WorkingDays" ? s.summary.workingDays : s.summary.calendarDays}</bdi></dd>
                </div>
                <div className="flex justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2">
                  <dt className="font-medium">{t(simulatorLabels.dayRate)}</dt>
                  <dd><MoneyCell value={s.dayRate} bold /></dd>
                </div>
              </dl>
            </DetailSection>

            <DetailSection title={t(simulatorLabels.step2)}>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t(simulatorLabels.absenceDays)}</dt>
                  <dd><bdi dir="ltr" className="font-medium">{s.absence.days}</bdi></dd>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <dt><bdi dir="ltr">{s.dayRate.toLocaleString("en-US")} × {s.absence.days}</bdi></dt>
                  <dd />
                </div>
                <div className="flex justify-between gap-3 rounded-lg bg-destructive/5 px-3 py-2">
                  <dt className="font-medium">{t(simulatorLabels.absenceAmount)}</dt>
                  <dd><MoneyCell value={s.absence.amount} bold /></dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  <dt>{t(simulatorLabels.lwp)}: <bdi dir="ltr">{s.summary.lwpDays}</bdi></dt>
                  <dd>{t(simulatorLabels.overtime)}: <bdi dir="ltr">{s.summary.overtimeHours}</bdi></dd>
                </div>
              </dl>
            </DetailSection>
          </div>

          <DetailSection title={t(simulatorLabels.step3)}>
            <p className="mb-3 text-xs text-muted-foreground">
              {t(simulatorLabels.grace)}: <bdi dir="ltr">{s.policy.graceMinutes}</bdi> · {s.policy.latenessMethod}
            </p>
            {s.lateness.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(simulatorLabels.noLate)}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-2 py-1.5 text-start font-medium">{t(simulatorLabels.minutes)}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t(simulatorLabels.rule)}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t(simulatorLabels.fraction)}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t(simulatorLabels.amount)}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lateness.events.map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-2"><bdi dir="ltr">{e.minutes}</bdi></td>
                      <td className="px-2 py-2">{e.withinGrace ? <StatusBadge label={t(simulatorLabels.withinGrace)} /> : <bdi dir="ltr">{e.rule}</bdi>}</td>
                      <td className="px-2 py-2"><bdi dir="ltr">{e.dayFraction || "—"}</bdi></td>
                      <td className="px-2 py-2"><MoneyCell value={e.amount} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-3 flex justify-between gap-3 rounded-lg bg-destructive/5 px-3 py-2 text-sm">
              <span className="font-medium">{t(simulatorLabels.latenessTotal)}</span>
              <MoneyCell value={s.lateness.total} bold />
            </div>
          </DetailSection>

          <DetailSection title={t(simulatorLabels.step4)}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t(simulatorLabels.grossBefore)}</dt><dd><MoneyCell value={s.grossBefore} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">− {t(simulatorLabels.absenceAmount)}</dt><dd><MoneyCell value={s.absence.amount} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">− {t(simulatorLabels.latenessTotal)}</dt><dd><MoneyCell value={s.lateness.total} /></dd></div>
              <div className="flex justify-between gap-3 border-t border-border pt-2"><dt className="font-medium">{t(simulatorLabels.grossAfter)}</dt><dd><MoneyCell value={s.grossAfter} bold /></dd></div>
              <div className="flex justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2"><dt className="font-medium">{t(simulatorLabels.cap)} ({s.cap.percent}%)</dt><dd><MoneyCell value={s.cap.amount} bold /></dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{t(simulatorLabels.reduceGross)}</p>

            {whatIf && (
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <p className="text-xs font-medium text-muted-foreground">{t(simulatorLabels.whatIf)}</p>
                {([
                  [simulatorLabels.whatIfFive, whatIf.five],
                  [simulatorLabels.whatIfMonth, whatIf.month],
                ] as const).map(([label, r]) => (
                  <div key={label.en} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <span>{t(label)} — <MoneyCell value={r.amount} bold /></span>
                    <span className="text-muted-foreground">
                      {r.plan.months === 1 ? t(simulatorLabels.fitsThisMonth) : (
                        <>
                          {t(simulatorLabels.spreadOver)} <bdi dir="ltr">{r.plan.months}</bdi> {t(simulatorLabels.monthsEach)}
                          <MoneyCell value={r.plan.rows[0].amount} />
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}
