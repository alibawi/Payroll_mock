"use client";

import { ArrowUpCircle, BadgePlus, Medal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { AdjustModal } from "@/components/payroll/compensation-tools";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { PayslipLineTable } from "@/components/payroll/payslip-line-table";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  compDetailLabels,
  compensationActionLabels,
  compensationStatusLabels,
  compensationStatusTones,
  employeeStatusLabels,
  employmentTypeLabels,
  maritalLabels,
  paymentMethodLabels,
} from "@/lib/i18n/payroll-compensation-labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { useApi } from "@/lib/payroll/api-client";
import { yearsBetween } from "@/lib/payroll/compensation-validation";
import { formatDate } from "@/lib/payroll/format";
import { canSeeAmounts, DEPT_HEAD_DEPARTMENT } from "@/lib/payroll/permissions";
import { computeCompensationPreview, type ConfigBundle, type PreviewResult } from "@/lib/payroll/preview";
import {
  parseGradeStepId,
  type CompensationActivity,
  type EmployeeCompensation,
  type EmployeeCompensationComponent,
  type CompensationStatus,
} from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { useRole } from "@/components/role-provider";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = {
  employee: Employee;
  records: (EmployeeCompensation & { status: CompensationStatus; overrides: EmployeeCompensationComponent[] })[];
  current: (EmployeeCompensation & { status: CompensationStatus; overrides: EmployeeCompensationComponent[] }) | null;
  preview: PreviewResult | null;
  activity: CompensationActivity[];
  minimumWage: number;
};

export default function EmployeeCompensationPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { t } = useLocale();
  const can = useCan();
  const { role } = useRole();
  const detail = useApi<Detail>(`/api/payroll/compensations/${employeeId}`);
  const bundle = useApi<ConfigBundle>("/api/payroll/config/bundle");
  const [tool, setTool] = useState<"increment" | "promotion" | null>(null);

  const d = detail.data;
  const showAmounts = canSeeAmounts(role);
  const name = (c: { name: { ar: string; en: string } } | undefined) => (c ? t(c.name) : "");
  const compName = (id: string) => name(bundle.data?.components.find((c) => c.id === id));

  const historyGross = useMemo(() => {
    if (!d || !bundle.data) return new Map<string, number>();
    return new Map(
      d.records.map((r) => [
        r.id,
        computeCompensationPreview({ ...r, date: r.effectiveFrom, overrides: r.overrides }, bundle.data!).gross,
      ])
    );
  }, [d, bundle.data]);

  if (detail.error) {
    return (
      <EmptyState title={compDetailLabels.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/compensations" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {t(compDetailLabels.backToList)}
        </Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  if (role === "deptHead" && d.employee.department !== DEPT_HEAD_DEPARTMENT) {
    return <EmptyState title={{ ar: "خارج نطاق قسمك", en: "Outside your department" }} />;
  }

  const e = d.employee;
  const c = d.current;
  const profile = bundle.data?.profiles.find((p) => p.id === c?.profileId);
  const structure = bundle.data?.structures.find((s) => s.id === c?.salaryStructureId);
  const cell = parseGradeStepId(c?.gradeStepId);
  const isGov = Boolean(cell);

  const timeline: TimelineItem[] = d.records.map((r) => {
    const rc = parseGradeStepId(r.gradeStepId);
    return {
      id: r.id,
      title: (
        <span className="flex flex-wrap items-center gap-2">
          <bdi dir="ltr">{formatDate(r.effectiveFrom)}</bdi> → {r.effectiveTo ? <bdi dir="ltr">{formatDate(r.effectiveTo)}</bdi> : t(configCommon.openEnded)}
          <StatusBadge label={t(compensationStatusLabels[r.status])} tone={compensationStatusTones[r.status]} />
        </span>
      ),
      description: (
        <span className="space-y-0.5">
          <span className="block">
            {rc ? (
              <>
                {t(compDetailLabels.gradeStep)}: <bdi dir="ltr">{rc.grade} / {rc.step}</bdi>
              </>
            ) : r.baseSalary != null ? (
              <>
                {t(compDetailLabels.baseSalary)}: <Amount value={r.baseSalary} />
              </>
            ) : null}
            {historyGross.has(r.id) && (
              <>
                {" · "}
                {t({ ar: "الإجمالي", en: "Gross" })}: <Amount value={historyGross.get(r.id)!} />
              </>
            )}
          </span>
          {r.changeReason && <span className="block text-xs">{t(compDetailLabels.reason)}: {r.changeReason}</span>}
        </span>
      ),
    };
  });

  const auditItems: TimelineItem[] = d.activity.map((a) => ({
    id: a.id,
    title: `${t(compensationActionLabels[a.action])} — ${t(a.summary)}`,
    timestamp: formatDate(a.timestamp),
    description: t(a.actor.name),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: e.fullNameAr, en: e.fullNameEn }}
        description={{
          ar: `${e.employeeCode} · ${e.position} · ${e.department}`,
          en: `${e.employeeCode} · ${e.positionEn} · ${e.departmentEn}`,
        }}
        actions={
          <>
            <StatusBadge label={t(employeeStatusLabels[e.status])} tone={e.status === "active" ? "success" : e.status === "on_leave" ? "info" : "neutral"} />
            {can("payroll.compensation", "update") && c && isGov && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setTool("increment")}>
                  <ArrowUpCircle className="size-4" />
                  {t(compDetailLabels.increment)}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setTool("promotion")}>
                  <Medal className="size-4" />
                  {t(compDetailLabels.promotion)}
                </Button>
              </>
            )}
            {can("payroll.compensation", "create") && (
              <Link href={`/payroll/compensations/${e.id}/new`} className={cn(buttonVariants({ size: "sm" }))}>
                <BadgePlus className="size-4" />
                {t(compDetailLabels.assign)}
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(compDetailLabels.currentCompensation)}>
            {!c ? (
              <p className="text-sm text-muted-foreground">{t(compDetailLabels.none)}</p>
            ) : (
              <DetailGrid>
                <DetailField label={t(compDetailLabels.profile)}>{name(profile)}</DetailField>
                <DetailField label={t(compDetailLabels.structure)}>{name(structure)}</DetailField>
                <DetailField label={t(compDetailLabels.effectiveFrom)}><bdi dir="ltr">{formatDate(c.effectiveFrom)}</bdi></DetailField>
                {cell ? (
                  <>
                    <DetailField label={t(compDetailLabels.gradeStep)}><bdi dir="ltr" className="font-semibold">{cell.grade} / {cell.step}</bdi></DetailField>
                    <DetailField label={t(compDetailLabels.nominal)}>{d.preview?.nominalSalary != null && <Amount value={d.preview.nominalSalary} />}</DetailField>
                  </>
                ) : (
                  <DetailField label={t(compDetailLabels.baseSalary)}>{c.baseSalary != null && <Amount value={c.baseSalary} />}</DetailField>
                )}
                <DetailField label={t(compDetailLabels.payment)}>{t(paymentMethodLabels[c.paymentMethod])}</DetailField>
                <DetailField label={t(compDetailLabels.bankAccount)}>{c.bankAccountNo && <bdi dir="ltr" className="font-mono text-xs">{showAmounts ? c.bankAccountNo : "••••••••"}</bdi>}</DetailField>
                <DetailField label={t(compDetailLabels.costCenter)}>{c.costCenterId && <bdi dir="ltr">{c.costCenterId}</bdi>}</DetailField>
                <DetailField label={t(compDetailLabels.maritalStatus)}>{t(maritalLabels[c.taxMaritalStatus])}</DetailField>
                <DetailField label={t(compDetailLabels.children)}><bdi dir="ltr">{c.eligibleChildrenCount}</bdi></DetailField>
                <DetailField label={t(compDetailLabels.pensionExempt)}>{c.isPensionExempt ? t(commonLabels.yes) : t(commonLabels.no)}</DetailField>
                <DetailField label={t(compDetailLabels.serviceYears)}><bdi dir="ltr">{yearsBetween(e.joiningDate)}</bdi></DetailField>
                <DetailField label={t({ ar: "نوع التوظيف", en: "Employment type" })}>{t(employmentTypeLabels[e.employmentType])}</DetailField>
              </DetailGrid>
            )}
          </DetailSection>

          {c && d.preview && (
            <DetailSection title={t(compDetailLabels.previewTitle)}>
              {showAmounts ? (
                <>
                  <PayslipLineTable
                    lines={d.preview.lines}
                    showBase={false}
                    summary={{
                      grossPay: d.preview.gross,
                      totalDeductions: d.preview.employeeStatutory + d.preview.incomeTax,
                      netPay: d.preview.net,
                      employerCost: d.preview.employerCost,
                    }}
                  />
                  <p className="mt-3 text-xs text-muted-foreground">{t(compDetailLabels.previewNote)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t({ ar: "المبالغ مخفية حسب صلاحية دورك.", en: "Amounts are hidden for your role." })}</p>
              )}
            </DetailSection>
          )}

          {c && (
            <DetailSection title={t(compDetailLabels.overrides)}>
              {c.overrides.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(compDetailLabels.noOverrides)}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(configCommon.name)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(compDetailLabels.amount)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(compDetailLabels.percent)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.overrides.map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="px-2 py-2">{compName(o.componentId)}</td>
                        <td className="px-2 py-2">{o.amount != null ? <Amount value={o.amount} /> : "—"}</td>
                        <td className="px-2 py-2">{o.percent != null ? <bdi dir="ltr">{o.percent}%</bdi> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DetailSection>
          )}
        </div>

        <div className="space-y-5">
          <DetailSection title={t(compDetailLabels.history)}>
            <Timeline items={timeline} />
          </DetailSection>
          <DetailSection title={t(compDetailLabels.related)}>
            <ul className="space-y-1.5 text-sm">
              {[
                [compDetailLabels.loans, "/payroll/loans"],
                [compDetailLabels.penalties, "/payroll/penalties"],
                [compDetailLabels.payslips, "/payroll/runs"],
              ].map(([label, href]) => (
                <li key={href as string} className="flex items-center justify-between gap-2">
                  <Link href={href as string} className="underline-offset-2 hover:underline">
                    {t(label as typeof compDetailLabels.loans)}
                  </Link>
                  <StatusBadge label={t(compDetailLabels.soon)} className="text-[10px]" />
                </li>
              ))}
            </ul>
          </DetailSection>
          <DetailSection title={t(compDetailLabels.audit)}>
            <Timeline items={auditItems} emptyMessage={t({ ar: "لا توجد حركات", en: "No activity yet" })} />
          </DetailSection>
        </div>
      </div>

      {tool && c?.gradeStepId && (
        <AdjustModal
          kind={tool}
          employeeId={e.id}
          currentGradeStepId={c.gradeStepId}
          bundle={bundle.data}
          onClose={() => setTool(null)}
          onDone={() => {
            setTool(null);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}
