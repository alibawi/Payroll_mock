"use client";

import { useEffect, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { JournalPreview } from "@/components/payroll/journal-preview";
import { MoneyCell } from "@/components/payroll/money-cell";
import { OptionSelect } from "@/components/payroll/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { loanDetailLabels, loanActionLabels } from "@/lib/i18n/payroll-loan-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { EmployeeLoan, EmployeeLoanInstallment, JournalLine } from "@/lib/payroll/types";

export type LoanActionKind = "submit" | "approve" | "reject" | "cancel" | "disburse" | "earlySettle" | "defer" | "waive";

type TransitionResult = { journal?: JournalLine[]; journalRef?: string; remaining?: number };

/**
 * Dialog for one state-machine action of a loan: confirmations (submit / approve / cancel), a reason (reject),
 * the disbursement with its journal preview, early settlement (cash or payroll) and instalment defer / waive.
 */
export function LoanActionDialog({
  kind,
  loan,
  installments,
  presetInstallmentId,
  onClose,
  onDone,
}: {
  kind: LoanActionKind;
  loan: EmployeeLoan;
  installments: EmployeeLoanInstallment[];
  presetInstallmentId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const endpoint = `/api/payroll/loans/${loan.id}/transition`;

  const [reason, setReason] = useState("");
  const [account, setAccount] = useState(loan.disbursementAccountCode);
  const [source, setSource] = useState<"Cash" | "Payroll">("Cash");
  const [installmentId, setInstallmentId] = useState(presetInstallmentId ?? "");
  const [journal, setJournal] = useState<{ lines: JournalLine[]; ref?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = installments.filter((i) => i.status === "Pending");
  const remaining = pending.reduce((s, i) => s + i.amount, 0);

  // Disbursement shows the journal that would be posted; refresh it when the paying account changes.
  useEffect(() => {
    if (kind !== "disburse") return;
    let cancelled = false;
    apiFetch<TransitionResult>(endpoint, { method: "POST", body: { action: "previewJournal", accountCode: account } })
      .then((r) => !cancelled && r.journal && setJournal({ lines: r.journal, ref: r.journalRef }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind, account, endpoint]);

  async function run() {
    setError(null);
    if (kind === "reject" && !reason.trim()) {
      setError(t({ ar: "سبب الرفض مطلوب", en: "A rejection reason is required" }));
      return;
    }
    if ((kind === "defer" || kind === "waive") && !installmentId) {
      setError(t(loanDetailLabels.pickInstallment));
      return;
    }
    setBusy(true);
    try {
      await apiFetch<TransitionResult>(endpoint, {
        method: "POST",
        body: { action: kind, reason, accountCode: account, source, installmentId },
      });
      onDone();
    } catch (e) {
      const message = e instanceof ApiError ? Object.values(e.fieldErrors ?? {})[0]?.message : undefined;
      setError(message ? t(message) : (e as Error).message);
      setBusy(false);
    }
  }

  const titles: Record<LoanActionKind, { ar: string; en: string }> = {
    submit: loanDetailLabels.submitTitle,
    approve: loanDetailLabels.approveTitle,
    reject: loanDetailLabels.rejectTitle,
    cancel: loanDetailLabels.cancelTitle,
    disburse: loanDetailLabels.disburseTitle,
    earlySettle: loanDetailLabels.settleTitle,
    defer: loanDetailLabels.deferTitle,
    waive: loanDetailLabels.waiveTitle,
  };
  const bodies: Partial<Record<LoanActionKind, { ar: string; en: string }>> = {
    approve: loanDetailLabels.approveBody,
    reject: loanDetailLabels.rejectBody,
    cancel: loanDetailLabels.cancelBody,
    disburse: loanDetailLabels.disburseBody,
    earlySettle: loanDetailLabels.settleBody,
    defer: loanDetailLabels.deferBody,
    waive: loanDetailLabels.waiveBody,
  };

  const installmentOptions = pending.map((i) => ({
    value: i.id,
    label: `#${i.seqNo} · ${formatPeriod(i.duePeriodId)} · ${i.amount.toLocaleString("en-US")}`,
  }));

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      className={kind === "disburse" || kind === "earlySettle" ? "max-h-[90vh] overflow-y-auto sm:max-w-xl" : undefined}
      title={t(titles[kind])}
      description={bodies[kind] ? t(bodies[kind]!) : undefined}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" variant={kind === "cancel" || kind === "reject" ? "destructive" : "default"} onClick={run} disabled={busy}>
            {busy ? t({ ar: "جارٍ التنفيذ...", en: "Working..." }) : t(loanActionLabels[kind])}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <bdi dir="ltr" className="font-mono">{loan.loanNo}</bdi> · <MoneyCell value={loan.principal} />
        </p>

        {kind === "reject" && (
          <FormField label={t(loanDetailLabels.rejectReason)} required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        )}
        {kind === "cancel" && (
          <FormField label={t({ ar: "السبب (اختياري)", en: "Reason (optional)" })}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        )}

        {kind === "disburse" && (
          <>
            <FormField label={t(loanDetailLabels.payFrom)}>
              <OptionSelect
                value={account}
                onChange={setAccount}
                options={[
                  { value: "1110", label: `1110 — ${t(loanDetailLabels.cash)}` },
                  { value: "1120", label: `1120 — ${t(loanDetailLabels.bank)}` },
                ]}
              />
            </FormField>
            {journal && <JournalPreview lines={journal.lines} reference={journal.ref} />}
            <p className="text-xs text-muted-foreground">{t({ ar: "معاينة فقط — لا يُرحَّل قيد حقيقي إلى المالية.", en: "Preview only — no real journal is posted to Finance." })}</p>
          </>
        )}

        {kind === "earlySettle" && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
              <span>{t(loanDetailLabels.settleRemaining)} ({pending.length})</span>
              <MoneyCell value={remaining} bold />
            </div>
            <FormField label={t(loanDetailLabels.settleSource)}>
              <OptionSelect
                value={source}
                onChange={(v) => setSource(v as "Cash" | "Payroll")}
                options={[
                  { value: "Cash", label: t(loanDetailLabels.settleCash) },
                  { value: "Payroll", label: t(loanDetailLabels.settlePayroll) },
                ]}
              />
            </FormField>
          </>
        )}

        {(kind === "defer" || kind === "waive") && (
          <FormField label={t(loanDetailLabels.pickInstallment)} required>
            <OptionSelect value={installmentId} onChange={setInstallmentId} options={installmentOptions} placeholder={t(loanDetailLabels.pickInstallment)} />
          </FormField>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
