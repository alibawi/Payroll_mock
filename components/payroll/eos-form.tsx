"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmployeeSelect } from "@/components/employee-select";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { eosLabels as L, eosReasonLabels } from "@/lib/i18n/payroll-report-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import type { EndOfServiceCalculation, FieldErrors, TerminationReason } from "@/lib/payroll/types";

type Calc = {
  ctx: { eligible: boolean; lastWage: number; serviceYears: number; defaultLeaveDays: number; dayRateDivisor: number; joiningDate: string; roundingRule: number } | null;
  leaveDays?: number;
  result: { weeklyWage: number; dayRate: number; gratuityAmount: number; accruedLeavePay: number; arbitraryDismissalCompensation: number; totalAmount: number } | null;
};

/** Create / edit form of an end-of-service claim with the live calculator (spec §8 screen 7, T-4…T-10). */
export function EosForm({ claim }: { claim?: EndOfServiceCalculation }) {
  const { t } = useLocale();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(claim?.employeeId ?? "");
  const [date, setDate] = useState(claim?.terminationDate ?? "");
  const [reason, setReason] = useState<TerminationReason>(claim?.terminationReason ?? "Resignation");
  const [leaveDays, setLeaveDays] = useState<number | null>(claim?.accruedLeaveDays ?? null);
  const [compensation, setCompensation] = useState<number | null>(claim?.arbitraryDismissalCompensation ?? 0);
  const [notes, setNotes] = useState(claim?.notes ?? "");
  const [calc, setCalc] = useState<Calc | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const message = (key: string) => (errors[key] ? t(errors[key].message) : undefined);

  // the calculator re-runs on the server whenever an input changes
  useEffect(() => {
    if (!employeeId || !date) return;
    let cancelled = false;
    const q = new URLSearchParams({ employeeId, terminationDate: date, reason, compensation: String(compensation ?? 0) });
    if (leaveDays !== null) q.set("leaveDays", String(leaveDays));
    apiFetch<Calc>(`/api/payroll/end-of-service/context?${q}`)
      .then((c) => !cancelled && setCalc(c))
      .catch(() => !cancelled && setCalc(null));
    return () => {
      cancelled = true;
    };
  }, [employeeId, date, reason, leaveDays, compensation]);

  const ctx = employeeId && date ? calc?.ctx : null;
  const result = employeeId && date ? calc?.result : null;
  const shownLeave = leaveDays ?? calc?.leaveDays ?? ctx?.defaultLeaveDays ?? 0;

  async function submit() {
    setBusy(true);
    setErrors({});
    setError(null);
    const body = { employeeId, terminationDate: date, terminationReason: reason, accruedLeaveDays: shownLeave, arbitraryDismissalCompensation: compensation ?? 0, notes };
    try {
      const saved = claim
        ? await apiFetch<EndOfServiceCalculation>(`/api/payroll/end-of-service/${claim.id}`, { method: "PATCH", body })
        : await apiFetch<EndOfServiceCalculation>("/api/payroll/end-of-service", { method: "POST", body });
      router.push(`/payroll/end-of-service/${saved.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  const line = (label: string, value: number, opts: { hint?: string; bold?: boolean; muted?: boolean } = {}) => (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <div>
        <p className={opts.bold ? "font-semibold" : ""}>{label}</p>
        {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
      </div>
      <MoneyCell value={value} bold={opts.bold} muted={opts.muted} />
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <DetailSection title={t(claim ? L.editTitle : L.newTitle)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(L.employee)} required error={message("employeeId")} className="sm:col-span-2">
              <EmployeeSelect value={employeeId} onValueChange={setEmployeeId} disabled={Boolean(claim)} />
            </FormField>
            <FormField label={t(L.terminationDate)} required error={message("terminationDate")}>
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.terminationDate || undefined} />
            </FormField>
            <FormField label={t(L.terminationReason)} required error={message("terminationReason")}>
              <OptionSelect value={reason} onChange={(v) => setReason(v as TerminationReason)} options={Object.entries(eosReasonLabels).map(([value, label]) => ({ value, label: t(label) }))} />
            </FormField>
            <FormField label={t(L.leaveDays)} error={message("accruedLeaveDays")}>
              <Input dir="ltr" inputMode="decimal" value={leaveDays === null ? String(shownLeave || "") : String(leaveDays)} onChange={(e) => setLeaveDays(e.target.value === "" ? 0 : Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} />
            </FormField>
            <FormField label={t(L.compensation)} hint={reason !== "Termination" ? t(L.compensationOnly) : undefined}>
              <MoneyInput value={compensation} onChange={setCompensation} disabled={reason !== "Termination"} />
            </FormField>
            <FormField label={t(L.notes)} className="sm:col-span-2">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </div>
        </DetailSection>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" onClick={submit} disabled={busy || !employeeId || !date || (ctx ? !ctx.eligible : false)}>{t(L.save)}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={busy}>{t(commonLabels.cancel)}</Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <DetailSection title={t(L.calculator)} className="lg:sticky lg:top-4">
          {!ctx ? (
            <p className="text-sm text-muted-foreground">{t(L.pickEmployee)}</p>
          ) : !ctx.eligible ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-secondary-orange/40 bg-secondary-orange/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-secondary-orange" />
              {t(L.govNote)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-2 gap-3 pb-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t(L.serviceYears)}</p>
                  <p className="text-lg font-semibold"><bdi dir="ltr">{ctx.serviceYears}</bdi></p>
                  <p className="text-[11px] text-muted-foreground"><bdi dir="ltr">{ctx.joiningDate} → {date}</bdi></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t(L.lastWage)}</p>
                  <p className="text-lg font-semibold"><MoneyCell value={ctx.lastWage} /></p>
                </div>
              </div>
              {result && (
                <>
                  {line(t(L.weeklyWage), result.weeklyWage, { muted: true })}
                  {line(t(L.gratuity), result.gratuityAmount, { hint: reason === "DismissalDisciplinary" ? t(L.noGratuityDisciplinary) : t(L.gratuityFormula) })}
                  {line(t(L.leavePay), result.accruedLeavePay, { hint: `${shownLeave} × ${result.dayRate.toLocaleString("en-US")}` })}
                  {line(t(L.compensationLine), result.arbitraryDismissalCompensation)}
                  <div className="pt-1">{line(t(L.totalLine), result.totalAmount, { bold: true })}</div>
                </>
              )}
              <p className="pt-3 text-[11px] text-muted-foreground">{t(L.illustrative)}</p>
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  );
}

