"use client";

import { Ban, BadgeCheck, CalendarX2, CircleDollarSign, Handshake, Pencil, Send, ThumbsDown, TriangleAlert, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { LoanActionDialog, type LoanActionKind } from "@/components/payroll/loan-actions";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import {
  installmentStatusLabels,
  installmentStatusTones,
  loanActionLabels,
  loanActivityLabels,
  loanDetailLabels,
  loanStatusLabels,
  loanStatusTones,
  loanTypeLabels,
} from "@/lib/i18n/payroll-loan-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { LOAN_ACTIONS } from "@/lib/payroll/loans";
import { formatPeriod } from "@/lib/payroll/periods";
import type { EmployeeLoan, EmployeeLoanInstallment, GlAccount, LoanActivity } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = {
  loan: EmployeeLoan;
  installments: EmployeeLoanInstallment[];
  activity: LoanActivity[];
  employee: Employee | null;
  guarantor: Employee | null;
  cap: { gross: number; capPercent: number; otherDeductions: number; cap: number; total: number; exceeds: boolean; excess: number } | null;
};

const ICONS: Record<string, typeof Send> = {
  submit: Send, approve: BadgeCheck, reject: ThumbsDown, disburse: CircleDollarSign, cancel: Ban,
  earlySettle: Handshake, edit: Pencil, defer: CalendarX2, waive: Undo2,
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useLocale();
  const can = useCan();
  const detail = useApi<Detail>(`/api/payroll/loans/${id}`);
  const gl = useApi<GlAccount[]>("/api/payroll/config/gl-accounts");

  const [dialog, setDialog] = useState<{ kind: LoanActionKind; installmentId?: string } | null>(null);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const d = detail.data;
  const glName = (code: string) => {
    const a = gl.data?.find((x) => x.code === code);
    return (
      <span>
        <bdi dir="ltr" className="font-mono text-xs">{code}</bdi>
        {a && <> — {t(a.name)}</>}
      </span>
    );
  };

  if (detail.error) {
    return (
      <EmptyState title={loanDetailLabels.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/loans" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(loanDetailLabels.backToList)}</Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { loan, installments, employee } = d;
  const empName = employee ? (locale === "ar" ? employee.fullNameAr : employee.fullNameEn) : "—";
  const repaid = loan.totalRepayable - loan.outstandingBalance;
  const progress = loan.totalRepayable ? (repaid / loan.totalRepayable) * 100 : 0;
  const interest = loan.totalRepayable - loan.principal;

  // Which buttons exist depends on status (state machine) and on the mock role (permission).
  const permissionOf: Record<string, Parameters<typeof can>[1]> = {
    edit: "update", submit: "create", approve: "approve", reject: "approve", disburse: "disburse",
    cancel: loan.status === "Draft" ? "create" : "cancel", earlySettle: "update", defer: "approve", waive: "approve",
  };
  const actions = LOAN_ACTIONS[loan.status].filter((a) => can("payroll.loan", permissionOf[a]));
  const rowActionsAllowed = loan.status === "Active" && can("payroll.loan", "approve");

  async function postComment() {
    if (!comment.trim()) return;
    setCommentBusy(true);
    try {
      await apiFetch(`/api/payroll/loans/${id}/transition`, { method: "POST", body: { action: "comment", text: comment } });
      setComment("");
      detail.reload();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      setCommentBusy(false);
    }
  }

  const timeline: TimelineItem[] = d.activity.map((a) => ({
    id: a.id,
    title: a.action === "Comment" ? t(loanActivityLabels.Comment) : `${t(loanActivityLabels[a.action])} — ${t(a.summary)}`,
    description: (
      <>
        {a.action === "Comment" && <span className="block text-foreground">{t(a.summary)}</span>}
        {t(a.actor.name)}
      </>
    ),
    timestamp: formatDate(a.timestamp),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: loan.loanNo, en: loan.loanNo }}
        description={{ ar: `${employee?.fullNameAr ?? ""} — ${loanTypeLabels[loan.loanType].ar}`, en: `${employee?.fullNameEn ?? ""} — ${loanTypeLabels[loan.loanType].en}` }}
        actions={
          <>
            <StatusBadge label={t(loanStatusLabels[loan.status])} tone={loanStatusTones[loan.status]} />
            {actions.map((a) => {
              const Icon = ICONS[a];
              if (a === "edit") {
                return (
                  <Link key={a} href={`/payroll/loans/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    <Icon className="size-4" />
                    {t(loanActionLabels.edit)}
                  </Link>
                );
              }
              if (a === "defer" || a === "waive") return null; // per-instalment buttons below, plus the menu entries here
              const destructive = a === "cancel" || a === "reject";
              return (
                <Button key={a} type="button" size="sm" variant={destructive ? "outline" : a === "submit" || a === "approve" || a === "disburse" ? "default" : "outline"} onClick={() => setDialog({ kind: a as LoanActionKind })}>
                  <Icon className="size-4" />
                  {t(loanActionLabels[a as keyof typeof loanActionLabels])}
                </Button>
              );
            })}
            {rowActionsAllowed && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "defer" })}>
                  <CalendarX2 className="size-4" />
                  {t(loanActionLabels.defer)}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "waive" })}>
                  <Undo2 className="size-4" />
                  {t(loanActionLabels.waive)}
                </Button>
              </>
            )}
          </>
        }
      />

      {loan.rejectionReason && loan.status === "Draft" && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">{t(loanDetailLabels.rejection)}:</span> {loan.rejectionReason}
        </div>
      )}
      {d.cap?.exceeds && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-secondary-orange/40 bg-secondary-orange/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-secondary-orange" />
          <div>
            <p className="font-medium">{t(loanDetailLabels.capWarningTitle)}</p>
            <p className="text-muted-foreground">{t(loanDetailLabels.capWarningBody)}</p>
            <p className="mt-1 text-xs">
              {t(loanDetailLabels.capDetail)}: <Amount value={d.cap.gross} /> · {t(loanDetailLabels.capLimit)} ({d.cap.capPercent}%): <Amount value={d.cap.cap} /> · {t(loanDetailLabels.capTotal)}: <Amount value={d.cap.total} />
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(loanDetailLabels.balanceCard)}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t(loanDetailLabels.totalRepayable)}</p>
                <p className="text-xl font-semibold"><Amount value={loan.totalRepayable} /></p>
                <p className="text-xs text-muted-foreground">
                  {t(loanDetailLabels.principal)} <Amount value={loan.principal} />
                  {interest > 0 && <> + {t(loanDetailLabels.interest)} <Amount value={interest} /></>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(loanDetailLabels.repaid)}</p>
                <p className="text-xl font-semibold text-secondary-green"><Amount value={repaid} /></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(loanDetailLabels.outstanding)}</p>
                <p className="text-xl font-semibold"><Amount value={loan.outstandingBalance} /></p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-secondary-green" style={{ width: `${progress}%` }} />
            </div>
          </DetailSection>

          <DetailSection title={t(loanDetailLabels.installments)}>
            {installments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t({ ar: "يُولَّد الجدول عند الاعتماد", en: "The schedule is generated on approval" })}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(loanDetailLabels.seq)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(loanDetailLabels.dueIn)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(loanDetailLabels.amount)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(loanDetailLabels.deducted)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(configCommon.status)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(loanDetailLabels.payslip)}</th>
                      {rowActionsAllowed && <th className="w-28" />}
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-2 py-2 tabular-nums text-muted-foreground">{i.seqNo}</td>
                        <td className="px-2 py-2">
                          <bdi dir="ltr">{formatPeriod(i.duePeriodId)}</bdi>
                          {i.deferredFromSeqNo != null && <span className="ms-1 text-[11px] text-muted-foreground">({t(loanDetailLabels.deferredFrom)}{i.deferredFromSeqNo})</span>}
                        </td>
                        <td className="px-2 py-2"><Amount value={i.amount} /></td>
                        <td className="px-2 py-2">{i.deductedAmount > 0 ? <Amount value={i.deductedAmount} /> : "—"}</td>
                        <td className="px-2 py-2"><StatusBadge label={t(installmentStatusLabels[i.status])} tone={installmentStatusTones[i.status]} /></td>
                        <td className="px-2 py-2">
                          {i.payslipId ? (
                            <span title={t(loanDetailLabels.payslipSoon)} className="cursor-help font-mono text-[11px] text-muted-foreground">
                              <bdi dir="ltr">{i.payslipId}</bdi>
                            </span>
                          ) : i.settlementSource ? (
                            <span className="text-xs text-muted-foreground">{i.settlementSource === "Cash" ? t({ ar: "نقداً", en: "Cash" }) : t({ ar: "من الراتب", en: "Payroll" })}</span>
                          ) : "—"}
                        </td>
                        {rowActionsAllowed && (
                          <td className="px-2 py-2">
                            {i.status === "Pending" && (
                              <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon-sm" aria-label={t(loanActionLabels.defer)} onClick={() => setDialog({ kind: "defer", installmentId: i.id })}>
                                  <CalendarX2 className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon-sm" aria-label={t(loanActionLabels.waive)} onClick={() => setDialog({ kind: "waive", installmentId: i.id })}>
                                  <Undo2 className="size-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title={t(loanDetailLabels.info)}>
            <DetailGrid>
              <DetailField label={t(loanDetailLabels.employee)}>
                {employee && <Link href={`/payroll/compensations/${employee.id}`} className="underline-offset-2 hover:underline">{empName}</Link>}
              </DetailField>
              <DetailField label={t(loanDetailLabels.guarantor)}>
                {d.guarantor && (locale === "ar" ? d.guarantor.fullNameAr : d.guarantor.fullNameEn)}
              </DetailField>
              <DetailField label={t(loanDetailLabels.loanDate)}><bdi dir="ltr">{formatDate(loan.loanDate)}</bdi></DetailField>
              <DetailField label={t(loanDetailLabels.firstDeduction)}><bdi dir="ltr">{formatPeriod(loan.firstDeductionPeriodId)}</bdi></DetailField>
              <DetailField label={t(loanDetailLabels.count)}><bdi dir="ltr">{loan.installmentCount}</bdi></DetailField>
              <DetailField label={t(loanDetailLabels.interest)}>
                {loan.interestType === "Flat" ? `${t(loanDetailLabels.flatInterest)} ${loan.interestRate}%` : t(loanDetailLabels.none)}
              </DetailField>
              <DetailField label={t(loanDetailLabels.reason)}>{loan.reason}</DetailField>
              <DetailField label={t(loanDetailLabels.costCenter)}>{loan.costCenterId && <bdi dir="ltr">{loan.costCenterId}</bdi>}</DetailField>
              <DetailField label={t(loanDetailLabels.approvedBy)}>{loan.approvedAt && <bdi dir="ltr">{formatDate(loan.approvedAt)}</bdi>}</DetailField>
              {loan.comments && <DetailField label={t(loanDetailLabels.comments)} className="sm:col-span-2 lg:col-span-3">{loan.comments}</DetailField>}
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(loanDetailLabels.accounts)}>
            <DetailGrid>
              <DetailField label={t(loanDetailLabels.receivable)}>{glName(loan.loanReceivableAccountCode)}</DetailField>
              <DetailField label={t(loanDetailLabels.disbursementAccount)}>{glName(loan.disbursementAccountCode)}</DetailField>
              <DetailField label={t(loanDetailLabels.journal)}>
                {loan.journalRef ? <bdi dir="ltr" className="font-mono text-xs">{loan.journalRef}</bdi> : <span className="text-muted-foreground">{t(loanDetailLabels.noJournal)}</span>}
              </DetailField>
            </DetailGrid>
          </DetailSection>
        </div>

        <div className="space-y-5">
          <DetailSection title={t(loanDetailLabels.audit)}>
            <div className="mb-4 flex gap-2">
              <Input placeholder={t(loanDetailLabels.addComment)} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postComment()} />
              <Button type="button" size="sm" variant="outline" disabled={commentBusy || !comment.trim()} onClick={postComment}>{t(loanDetailLabels.send)}</Button>
            </div>
            <Timeline items={timeline} />
          </DetailSection>
        </div>
      </div>

      {dialog && (
        <LoanActionDialog
          kind={dialog.kind}
          loan={loan}
          installments={installments}
          presetInstallmentId={dialog.installmentId}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}
