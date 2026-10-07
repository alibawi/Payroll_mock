"use client";

import { Ban, BadgeCheck, CircleDollarSign, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { JournalPreview } from "@/components/payroll/journal-preview";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels, roleLabels } from "@/lib/i18n/labels";
import { eosLabels as L, eosReasonLabels, eosStatusLabels, eosStatusTones } from "@/lib/i18n/payroll-report-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { EOS_ACTIONS } from "@/lib/payroll/eos";
import { formatDate } from "@/lib/payroll/format";
import { formatStamp } from "@/lib/payroll/run-view";
import type { EndOfServiceCalculation, EosActivity, JournalLine } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Role } from "@/components/role-provider";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

type Detail = { eos: EndOfServiceCalculation; employee: Employee | null; activity: EosActivity[] };
type Kind = "approve" | "pay" | "cancel";

export default function EosDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useLocale();
  const can = useCan();
  const detail = useApi<Detail>(`/api/payroll/end-of-service/${id}`);
  const [dialog, setDialog] = useState<Kind | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const d = detail.data;
  if (detail.error) {
    return (
      <EmptyState title={L.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/end-of-service" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(L.backToList)}</Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { eos, employee } = d;
  const empName = employee ? (locale === "ar" ? employee.fullNameAr : employee.fullNameEn) : "—";
  const permission = { edit: "update", approve: "approve", pay: "pay", cancel: "cancel" } as const;
  const actions = EOS_ACTIONS[eos.status].filter((a) => can("payroll.eos", permission[a]));

  async function sendComment() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/payroll/end-of-service/${id}/transition`, { method: "POST", body: { action: "comment", text: comment } });
      setComment("");
      detail.reload();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      setBusy(false);
    }
  }

  const timeline: TimelineItem[] = d.activity.map((a) => ({
    id: a.id,
    title: a.action === "Comment" ? t(L.actions.Comment) : `${t(L.actions[a.action])} — ${t(a.summary)}`,
    description: (<>{a.action === "Comment" && <span className="block text-foreground">{t(a.summary)}</span>}{t(a.actor.name)}</>),
    timestamp: formatStamp(a.timestamp),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: eos.eosNo, en: eos.eosNo }}
        description={{ ar: `${employee?.fullNameAr ?? ""} — ${eosReasonLabels[eos.terminationReason].ar}`, en: `${employee?.fullNameEn ?? ""} — ${eosReasonLabels[eos.terminationReason].en}` }}
        actions={
          <>
            <StatusBadge label={t(eosStatusLabels[eos.status])} tone={eosStatusTones[eos.status]} />
            {actions.includes("edit") && (
              <Link href={`/payroll/end-of-service/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Pencil className="size-4" />
                {t(L.edit)}
              </Link>
            )}
            {actions.includes("approve") && <Button size="sm" onClick={() => setDialog("approve")}><BadgeCheck className="size-4" />{t(L.approve)}</Button>}
            {actions.includes("pay") && <Button size="sm" onClick={() => setDialog("pay")}><CircleDollarSign className="size-4" />{t(L.pay)}</Button>}
            {actions.includes("cancel") && <Button size="sm" variant="outline" onClick={() => setDialog("cancel")}><Ban className="size-4" />{t(L.cancel)}</Button>}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(L.summary)}>
            <dl className="divide-y divide-border text-sm">
              <Row label={t(L.lastWage)} value={eos.lastWage} muted />
              <Row label={`${t(L.gratuity)} (${eos.serviceYears} ${t(L.serviceYears)})`} value={eos.gratuityAmount} />
              <Row label={`${t(L.leavePay)} (${eos.accruedLeaveDays})`} value={eos.accruedLeavePay} />
              <Row label={t(L.compensationLine)} value={eos.arbitraryDismissalCompensation} />
              <Row label={t(L.totalLine)} value={eos.totalAmount} bold />
            </dl>
            {eos.terminationReason === "DismissalDisciplinary" && <p className="mt-3 text-xs text-muted-foreground">{t(L.noGratuityDisciplinary)}</p>}
          </DetailSection>

          <DetailSection title={t({ ar: "البيانات", en: "Details" })}>
            <DetailGrid>
              <DetailField label={t(L.employee)}>{empName}</DetailField>
              <DetailField label={t(L.date)}><bdi dir="ltr">{formatDate(eos.terminationDate)}</bdi></DetailField>
              <DetailField label={t(L.reason)}>{t(eosReasonLabels[eos.terminationReason])}</DetailField>
              <DetailField label={t(L.approvedBy)}>{eos.approvedBy ? `${t(roleLabels[eos.approvedBy as Role] ?? { ar: eos.approvedBy, en: eos.approvedBy })} · ${formatStamp(eos.approvedAt)}` : ""}</DetailField>
              <DetailField label={t(L.journalRef)}>{eos.journalRef && <bdi dir="ltr" className="font-mono">{eos.journalRef}</bdi>}</DetailField>
              <DetailField label={t(L.paymentRef)}>{eos.paymentRef && <bdi dir="ltr" className="font-mono">{eos.paymentRef}</bdi>}</DetailField>
              <DetailField label={t(L.notes)} className="sm:col-span-2 lg:col-span-3">{eos.notes}</DetailField>
            </DetailGrid>
          </DetailSection>
        </div>

        <DetailSection title={t(L.activity)}>
          <div className="mb-4 flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t(L.commentPlaceholder)} onKeyDown={(e) => e.key === "Enter" && sendComment()} />
            <Button type="button" variant="outline" onClick={sendComment} disabled={busy || !comment.trim()}>{t(L.send)}</Button>
          </div>
          <Timeline items={timeline} />
        </DetailSection>
      </div>

      {dialog && <EosDialog kind={dialog} eos={eos} onClose={() => setDialog(null)} onDone={() => { setDialog(null); detail.reload(); }} />}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className={cn(bold ? "font-semibold" : "text-muted-foreground")}>{label}</dt>
      <dd className={bold ? "text-lg font-bold" : muted ? "text-muted-foreground" : "font-medium"}><Amount value={value} bold={bold} /></dd>
    </div>
  );
}

function EosDialog({ kind, eos, onClose, onDone }: { kind: Kind; eos: EndOfServiceCalculation; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [journal, setJournal] = useState<{ lines: JournalLine[]; ref: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/payroll/end-of-service/${eos.id}/transition`;

  useEffect(() => {
    if (kind !== "pay") return;
    let cancelled = false;
    apiFetch<{ journal: JournalLine[]; journalRef: string }>(endpoint, { method: "POST", body: { action: "previewJournal" } })
      .then((r) => !cancelled && setJournal({ lines: r.journal, ref: r.journalRef }))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [kind, endpoint]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(endpoint, { method: "POST", body: { action: kind } });
      onDone();
    } catch (e) {
      const message = e instanceof ApiError ? Object.values(e.fieldErrors ?? {})[0]?.message : undefined;
      setError(message ? t(message) : (e as Error).message);
      setBusy(false);
    }
  }

  const titles = { approve: L.approve, pay: L.pay, cancel: L.cancel };
  const bodies = { approve: L.approveBody, pay: L.payBody, cancel: L.cancelBody };
  return (
    <Modal
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      className={kind === "pay" ? "max-h-[90vh] overflow-y-auto sm:max-w-2xl" : undefined}
      title={t(titles[kind])}
      description={t(bodies[kind])}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" variant={kind === "cancel" ? "destructive" : "default"} onClick={submit} disabled={busy || (kind === "pay" && !journal)}>{t(titles[kind])}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground"><bdi dir="ltr" className="font-mono">{eos.eosNo}</bdi> · <Amount value={eos.totalAmount} /></p>
        {kind === "pay" && journal && <JournalPreview lines={journal.lines} reference={journal.ref} />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
