"use client";

import { Ban, BadgeCheck, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import {
  penaltyActionLabels,
  penaltyActivityLabels,
  penaltyDetailLabels,
  penaltyListLabels,
  penaltyStatusLabels,
  penaltyStatusTones,
  penaltyTypeLabels,
} from "@/lib/i18n/payroll-penalty-labels";
import { apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { PENALTY_ACTIONS } from "@/lib/payroll/penalties";
import { formatPeriod } from "@/lib/payroll/periods";
import type { DisciplinaryPenalty, PenaltyActivity, PenaltyInstallment } from "@/lib/payroll/types";
import type { SpreadPlan } from "@/lib/payroll/netProtection";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = {
  penalty: DisciplinaryPenalty;
  installments: PenaltyInstallment[];
  plan: SpreadPlan | null;
  activity: PenaltyActivity[];
  employee: Employee | null;
};

export default function PenaltyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useLocale();
  const can = useCan();
  const detail = useApi<Detail>(`/api/payroll/penalties/${id}`);

  const [dialog, setDialog] = useState<"approve" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const d = detail.data;
  if (detail.error) {
    return (
      <EmptyState title={penaltyDetailLabels.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/penalties" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(penaltyDetailLabels.backToList)}</Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { penalty, installments, plan, employee } = d;
  const empName = employee ? (locale === "ar" ? employee.fullNameAr : employee.fullNameEn) : "—";
  const permissionOf = { edit: "update", approve: "approve", cancel: penalty.status === "Draft" ? "update" : "approve" } as const;
  const actions = PENALTY_ACTIONS[penalty.status].filter((a) => can("payroll.penalty", permissionOf[a as keyof typeof permissionOf]));

  async function run(action: "approve" | "cancel" | "comment", text?: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/payroll/penalties/${id}/transition`, { method: "POST", body: { action, reason, text } });
      setDialog(null);
      setReason("");
      setComment("");
      detail.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const timeline: TimelineItem[] = d.activity.map((a) => ({
    id: a.id,
    title: a.action === "Comment" ? t(penaltyActivityLabels.Comment) : `${t(penaltyActivityLabels[a.action])} — ${t(a.summary)}`,
    description: (
      <>
        {a.action === "Comment" && <span className="block text-foreground">{t(a.summary)}</span>}
        {t(a.actor.name)}
      </>
    ),
    timestamp: formatDate(a.timestamp),
  }));

  const rows = installments.length > 0
    ? installments.map((i) => ({ key: i.id, seq: i.seqNo, period: i.duePeriodId, amount: i.amount, deducted: i.deductedAmount, status: i.status, payslip: i.payslipId, capacity: null as number | null, exceeds: false }))
    : (plan?.rows ?? []).map((r) => ({ key: `p${r.seqNo}`, seq: r.seqNo, period: r.duePeriodId, amount: r.amount, deducted: 0, status: "Pending" as const, payslip: null, capacity: r.capacity, exceeds: r.exceeds }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: penalty.penaltyNo, en: penalty.penaltyNo }}
        description={{ ar: `${employee?.fullNameAr ?? ""} — ${penaltyTypeLabels[penalty.penaltyType].ar}`, en: `${employee?.fullNameEn ?? ""} — ${penaltyTypeLabels[penalty.penaltyType].en}` }}
        actions={
          <>
            <StatusBadge label={t(penaltyStatusLabels[penalty.status])} tone={penaltyStatusTones[penalty.status]} />
            {actions.includes("edit") && (
              <Link href={`/payroll/penalties/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Pencil className="size-4" />
                {t(penaltyActionLabels.edit)}
              </Link>
            )}
            {actions.includes("approve") && (
              <Button type="button" size="sm" onClick={() => setDialog("approve")}>
                <BadgeCheck className="size-4" />
                {t(penaltyActionLabels.approve)}
              </Button>
            )}
            {actions.includes("cancel") && (
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog("cancel")}>
                <Ban className="size-4" />
                {t(penaltyActionLabels.cancel)}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(penaltyDetailLabels.decisionCard)}>
            <DetailGrid>
              <DetailField label={t(penaltyDetailLabels.decisionRef)}><bdi dir="ltr" className="font-mono text-xs">{penalty.decisionRef}</bdi></DetailField>
              <DetailField label={t(penaltyDetailLabels.decisionDate)}><bdi dir="ltr">{formatDate(penalty.decisionDate)}</bdi></DetailField>
              <DetailField label={t(penaltyDetailLabels.issuedBy)}>{penalty.issuedByUserId}</DetailField>
              <DetailField label={t(penaltyDetailLabels.amount)}><Amount value={penalty.computedAmount} bold /></DetailField>
              <DetailField label={t(penaltyDetailLabels.value)}>
                {penalty.value != null && (
                  <bdi dir="ltr">
                    {penalty.penaltyType === "FixedAmount" ? penalty.value.toLocaleString("en-US") : penalty.penaltyType === "DaysOfPay" ? `${penalty.value} ${t(penaltyDetailLabels.days)}` : `${penalty.value}%`}
                  </bdi>
                )}
              </DetailField>
              <DetailField label={t(penaltyDetailLabels.spread)}><bdi dir="ltr">{penalty.spreadOverMonths} {t(penaltyDetailLabels.months)}</bdi></DetailField>
              <DetailField label={t(penaltyDetailLabels.start)}><bdi dir="ltr">{formatPeriod(penalty.startPeriodId)}</bdi></DetailField>
              <DetailField label={t(penaltyDetailLabels.remaining)}><Amount value={penalty.remainingAmount} /></DetailField>
              <DetailField label={t(penaltyDetailLabels.approvedBy)}>{penalty.approvedAt && <bdi dir="ltr">{formatDate(penalty.approvedAt)}</bdi>}</DetailField>
              <DetailField label={t(penaltyDetailLabels.reason)} className="sm:col-span-2 lg:col-span-3">{penalty.reason}</DetailField>
              <DetailField label={t({ ar: "الموظف", en: "Employee" })}>
                {employee && <Link href={`/payroll/compensations/${employee.id}`} className="underline-offset-2 hover:underline">{empName}</Link>}
              </DetailField>
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(installments.length > 0 ? penaltyDetailLabels.installments : penaltyDetailLabels.plannedInstallments)}>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <>
                {plan?.autoSpread && penalty.status === "Draft" && <p className="mb-3 text-xs text-secondary-orange">{t(penaltyDetailLabels.autoSpreadNote)}</p>}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.seq)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.period)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(penaltyListLabels.amount)}</th>
                      {installments.length === 0 && <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.capacity)}</th>}
                      {installments.length > 0 && <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.deducted)}</th>}
                      <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.status)}</th>
                      {installments.length > 0 && <th className="px-2 py-1.5 text-start font-medium">{t(penaltyDetailLabels.payslip)}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-t border-border">
                        <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.seq}</td>
                        <td className="px-2 py-2"><bdi dir="ltr">{formatPeriod(r.period)}</bdi></td>
                        <td className="px-2 py-2"><Amount value={r.amount} /></td>
                        {installments.length === 0 && <td className={cn("px-2 py-2", r.exceeds && "text-destructive")}>{r.capacity != null && <Amount value={r.capacity} />}</td>}
                        {installments.length > 0 && <td className="px-2 py-2">{r.deducted > 0 ? <Amount value={r.deducted} /> : "—"}</td>}
                        <td className="px-2 py-2">
                          <StatusBadge label={t(r.status === "Deducted" ? penaltyDetailLabels.deductedStatus : penaltyDetailLabels.pending)} tone={r.status === "Deducted" ? "success" : "warning"} />
                        </td>
                        {installments.length > 0 && <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{r.payslip ? <bdi dir="ltr">{r.payslip}</bdi> : "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">{t(penaltyDetailLabels.payrollNote)}</p>
              </>
            )}
          </DetailSection>
        </div>

        <DetailSection title={t(penaltyDetailLabels.audit)} className="h-fit">
          <div className="mb-4 flex gap-2">
            <Input placeholder={t(penaltyDetailLabels.addComment)} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && comment.trim() && run("comment", comment)} />
            <Button type="button" size="sm" variant="outline" disabled={busy || !comment.trim()} onClick={() => run("comment", comment)}>{t(penaltyDetailLabels.send)}</Button>
          </div>
          <Timeline items={timeline} />
        </DetailSection>
      </div>

      {dialog && (
        <Modal
          open
          onOpenChange={(open) => !open && !busy && setDialog(null)}
          title={t(dialog === "approve" ? penaltyDetailLabels.approveTitle : penaltyDetailLabels.cancelTitle)}
          description={t(dialog === "approve" ? penaltyDetailLabels.approveBody : penaltyDetailLabels.cancelBody)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={busy}>{t(commonLabels.cancel)}</Button>
              <Button type="button" variant={dialog === "cancel" ? "destructive" : "default"} disabled={busy} onClick={() => run(dialog)}>
                {t(dialog === "approve" ? penaltyActionLabels.approve : penaltyActionLabels.cancel)}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground"><bdi dir="ltr" className="font-mono">{penalty.penaltyNo}</bdi> · <Amount value={penalty.computedAmount} /></p>
            {dialog === "cancel" && (
              <FormField label={t(penaltyDetailLabels.reasonOptional)}>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </FormField>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
