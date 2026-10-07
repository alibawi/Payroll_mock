"use client";

import { useEffect, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { JournalPreview } from "@/components/payroll/journal-preview";
import { MoneyCell } from "@/components/payroll/money-cell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { runActionLabels, runDetailLabels, runDialogLabels } from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import { costCentresOf, toJournalLines, type CostCentreBalance } from "@/lib/payroll/run-view";
import type { PayrollRun, RunJournalLine } from "@/lib/payroll/types";

export type RunDialogKind = "reject" | "post" | "pay" | "reverse";

type Preview = {
  journalRef?: string;
  paymentRef?: string;
  lines: RunJournalLine[];
  balance: CostCentreBalance[];
  byMethod?: { bank: { total: number; count: number }; cash: { total: number; count: number } };
};

/** One journal entry as a JournalPreview per cost centre (each balances on its own). */
export function JournalByCostCentre({ lines, reference }: { lines: RunJournalLine[]; reference?: string }) {
  const { t } = useLocale();
  const centres = costCentresOf(lines);
  return (
    <div className="space-y-5">
      {centres.map((cc, i) => (
        <div key={cc ?? "none"} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {t(runDetailLabels.costCentre)}: <bdi dir="ltr">{cc ?? "—"}</bdi>
          </p>
          <JournalPreview lines={toJournalLines(lines, cc)} reference={i === 0 ? reference : undefined} />
        </div>
      ))}
    </div>
  );
}

/**
 * Dialogs of the run actions that need more than a yes/no: a rejection reason, the posting journal preview,
 * the payment voucher summary and the reversal reason (spec §10 screens 7–8).
 */
export function RunActionDialog({ kind, run, onClose, onDone }: { kind: RunDialogKind; run: PayrollRun; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const endpoint = `/api/payroll/runs/${run.id}/transition`;
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "post" && kind !== "pay") return;
    let cancelled = false;
    apiFetch<Preview>(endpoint, { method: "POST", body: { action: kind === "post" ? "previewPosting" : "previewPayment" } })
      .then((p) => !cancelled && setPreview(p))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [kind, endpoint]);

  async function submit() {
    setError(null);
    if ((kind === "reject" || kind === "reverse") && !reason.trim()) {
      setError(t(kind === "reject" ? runDialogLabels.rejectReason : runDialogLabels.reverseReason) + " *");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(endpoint, { method: "POST", body: { action: kind, reason } });
      onDone();
    } catch (e) {
      const message = e instanceof ApiError ? Object.values(e.fieldErrors ?? {})[0]?.message : undefined;
      setError(message ? t(message) : (e as Error).message);
      setBusy(false);
    }
  }

  const titles = { reject: runDialogLabels.rejectTitle, post: runDialogLabels.postTitle, pay: runDialogLabels.payTitle, reverse: runDialogLabels.reverseTitle };
  const bodies = { reject: runDialogLabels.rejectBody, post: runDialogLabels.postBody, pay: runDialogLabels.payBody, reverse: runDialogLabels.reverseBody };
  const wide = kind === "post" || kind === "pay";
  const unbalanced = preview?.balance.some((b) => !b.balanced);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      className={wide ? "max-h-[90vh] overflow-y-auto sm:max-w-3xl" : undefined}
      title={t(titles[kind])}
      description={t(bodies[kind])}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button
            type="button"
            variant={kind === "reverse" || kind === "reject" ? "destructive" : "default"}
            onClick={submit}
            disabled={busy || (wide && (!preview || unbalanced))}
          >
            {busy ? t(runDialogLabels.working) : t(runActionLabels[kind])}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <bdi dir="ltr" className="font-mono">{run.runNo}</bdi> · <MoneyCell value={run.netTotal} /> · {run.employeeCount} {t(runDialogLabels.payslipsCount)}
        </p>

        {(kind === "reject" || kind === "reverse") && (
          <FormField label={t(kind === "reject" ? runDialogLabels.rejectReason : runDialogLabels.reverseReason)} required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        )}

        {kind === "post" && (preview ? <JournalByCostCentre lines={preview.lines} reference={preview.journalRef} /> : !error && <p className="text-sm text-muted-foreground">{t(runDialogLabels.working)}</p>)}

        {kind === "pay" &&
          (preview?.byMethod ? (
            <div className="space-y-4">
              <p className="text-sm">
                {t(runDialogLabels.paymentRef)}: <bdi dir="ltr" className="font-mono font-medium">{preview.paymentRef}</bdi>
              </p>
              <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                {(["bank", "cash"] as const).map((m) => (
                  <div key={m} className="flex items-center justify-between gap-3 bg-card px-4 py-3">
                    <dt className="text-sm text-muted-foreground">
                      {t(m === "bank" ? runDialogLabels.bank : runDialogLabels.cash)}
                      <span className="ms-2 text-xs">({preview.byMethod![m].count})</span>
                    </dt>
                    <dd className="font-semibold"><MoneyCell value={preview.byMethod![m].total} /></dd>
                  </div>
                ))}
              </dl>
              <JournalByCostCentre lines={preview.lines} reference={preview.paymentRef} />
            </div>
          ) : (
            !error && <p className="text-sm text-muted-foreground">{t(runDialogLabels.working)}</p>
          ))}

        {unbalanced && <StatusBadge tone="destructive" label={t(runDetailLabels.unbalanced)} />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
