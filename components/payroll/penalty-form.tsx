"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmployeeSelect } from "@/components/employee-select";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { useRole } from "@/components/role-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { commonLabels } from "@/lib/i18n/labels";
import { penaltyFormLabels, penaltyTypeLabels } from "@/lib/i18n/payroll-penalty-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import type { SpreadPlan } from "@/lib/payroll/netProtection";
import { validatePenaltyDraft } from "@/lib/payroll/penalties";
import { DEPT_HEAD_DEPARTMENT } from "@/lib/payroll/permissions";
import { addMonths, CURRENT_PERIOD, formatPeriod } from "@/lib/payroll/periods";
import type { DisciplinaryPenalty, FieldErrors, PenaltyType } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Preview = {
  amount: number;
  plan: SpreadPlan;
  capPercent: number;
  overBreachAction: "AutoSpread" | "Block";
  gross: number;
  dayRate: number;
  cap: number;
};

const PERIODS = Array.from({ length: 12 }, (_, i) => addMonths(CURRENT_PERIOD, i));

/** Penalty form with the live amount, instalment plan and monthly-cap check (P-1 … P-5, P-13). */
export function PenaltyForm({ penalty }: { penalty?: DisciplinaryPenalty }) {
  const { t } = useLocale();
  const router = useRouter();
  const { role } = useRole();
  const employees = useApi<Employee[]>("/api/hr/employees?status=active,on_leave");

  const [employeeId, setEmployeeId] = useState(penalty?.employeeId ?? "");
  const [type, setType] = useState<PenaltyType>(penalty?.penaltyType ?? "FixedAmount");
  const [value, setValue] = useState<number | null>(penalty?.value ?? null);
  const [reason, setReason] = useState(penalty?.reason ?? "");
  const [decisionRef, setDecisionRef] = useState(penalty?.decisionRef ?? "");
  const [decisionDate, setDecisionDate] = useState(penalty?.decisionDate ?? "");
  const [months, setMonths] = useState(String(penalty?.spreadOverMonths ?? 1));
  const [startPeriod, setStartPeriod] = useState(penalty?.startPeriodId ?? addMonths(CURRENT_PERIOD, 1));
  const [comments, setComments] = useState(penalty?.comments ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const scoped = useMemo(
    () => (employees.data ?? []).filter((e) => role !== "deptHead" || e.department === DEPT_HEAD_DEPARTMENT),
    [employees.data, role]
  );
  const needsValue = type !== "OneMonthSalary";
  const ready = Boolean(employeeId) && (!needsValue || (value ?? 0) > 0);
  const draft = {
    employeeId,
    penaltyType: type,
    value: needsValue ? value : null,
    reason,
    decisionRef,
    decisionDate,
    spreadOverMonths: Number(months),
    startPeriodId: startPeriod,
  };

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch<Preview>("/api/payroll/penalties/preview", { method: "POST", body: { ...draft, exceptPenaltyId: penalty?.id } })
        .then((r) => {
          if (cancelled) return;
          setPreview(r);
          setPreviewError(null);
        })
        .catch((e: Error) => {
          if (cancelled) return;
          setPreview(null);
          setPreviewError(e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors)[0].message.en : e.message);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, type, value, months, startPeriod, ready]);

  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);
  const valueLabel = type === "FixedAmount" ? penaltyFormLabels.valueFixed : type === "DaysOfPay" ? penaltyFormLabels.valueDays : penaltyFormLabels.valuePercent;

  async function save() {
    setMessage(null);
    const local = validatePenaltyDraft(draft);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setSaving(true);
    try {
      const saved = await apiFetch<DisciplinaryPenalty>(penalty ? `/api/payroll/penalties/${penalty.id}` : "/api/payroll/penalties", {
        method: penalty ? "PATCH" : "POST",
        body: { ...draft, comments },
      });
      router.push(`/payroll/penalties/${saved.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      const detail = error instanceof ApiError ? Object.values(error.fieldErrors ?? {})[0]?.message : undefined;
      setMessage(detail ? t(detail) : (error as Error).message);
      setSaving(false);
    }
  }

  const plan = preview?.plan;

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <DetailSection title={t(penalty ? penaltyFormLabels.editTitle : penaltyFormLabels.newTitle)}>
          {role === "deptHead" && <p className="mb-3 text-xs text-muted-foreground">{t(penaltyFormLabels.deptNote)}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(penaltyFormLabels.employee)} required error={err("employeeId")}>
              <EmployeeSelect value={employeeId} onValueChange={setEmployeeId} employees={scoped} disabled={Boolean(penalty)} />
            </FormField>
            <FormField label={t(penaltyFormLabels.type)} required error={err("penaltyType")}>
              <OptionSelect value={type} onChange={(v) => setType(v as PenaltyType)} options={Object.entries(penaltyTypeLabels).map(([value, label]) => ({ value, label: t(label) }))} />
            </FormField>
            {needsValue ? (
              <FormField label={t(valueLabel)} required error={err("value")}>
                {type === "FixedAmount" ? (
                  <MoneyInput value={value} onChange={setValue} invalid={!!errors.value} />
                ) : (
                  <Input type="number" step="any" dir="ltr" value={value ?? ""} onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))} aria-invalid={!!errors.value} />
                )}
              </FormField>
            ) : (
              <p className="self-end pb-2 text-xs text-muted-foreground">{t(penaltyFormLabels.oneMonthNote)}</p>
            )}
            <FormField label={t(penaltyFormLabels.months)} error={err("spreadOverMonths")}>
              <Input type="number" min={1} max={60} dir="ltr" value={months} onChange={(e) => setMonths(e.target.value)} disabled={type === "OneMonthSalary"} aria-invalid={!!errors.spreadOverMonths} />
            </FormField>
            <FormField label={t(penaltyFormLabels.startPeriod)} required error={err("startPeriodId")}>
              <OptionSelect value={startPeriod} onChange={setStartPeriod} invalid={!!errors.startPeriodId} options={PERIODS.map((p) => ({ value: p, label: formatPeriod(p) }))} />
            </FormField>
            <span />
            <FormField label={t(penaltyFormLabels.decisionRef)} required error={err("decisionRef")}>
              <Input dir="ltr" className="font-mono" placeholder="DISC-2026-000" value={decisionRef} onChange={(e) => setDecisionRef(e.target.value)} aria-invalid={!!errors.decisionRef} />
            </FormField>
            <FormField label={t(penaltyFormLabels.decisionDate)} required error={err("decisionDate")}>
              <Input type="date" dir="ltr" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} aria-invalid={!!errors.decisionDate} />
            </FormField>
            <FormField label={t(penaltyFormLabels.reason)} required error={err("reason")} className="sm:col-span-2">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} />
            </FormField>
            <FormField label={t(penaltyFormLabels.comments)} className="sm:col-span-2">
              <Input value={comments} onChange={(e) => setComments(e.target.value)} />
            </FormField>
          </div>
        </DetailSection>

        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={save}>{saving ? t({ ar: "جارٍ الحفظ...", en: "Saving..." }) : t(penaltyFormLabels.saveDraft)}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t(commonLabels.cancel)}</Button>
        </div>
      </div>

      <div className="space-y-5 xl:sticky xl:top-4 xl:h-fit">
        <DetailSection title={t(penaltyFormLabels.preview)}>
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t(penaltyFormLabels.fillIn)}</p>
          ) : previewError ? (
            <p className="text-sm text-destructive">{previewError}</p>
          ) : !preview || !plan ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : (
            <div className="space-y-3 text-sm">
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t(penaltyFormLabels.dayRate)}</dt><dd><MoneyCell value={preview.dayRate} /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t(penaltyFormLabels.amount)}</dt><dd><MoneyCell value={preview.amount} bold /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t(penaltyFormLabels.monthlyCap)} ({preview.capPercent}%)</dt><dd><MoneyCell value={preview.cap} /></dd></div>
              </dl>
              {plan.autoSpread && (
                <p className="flex items-start gap-2 rounded-lg bg-secondary-orange/10 px-3 py-2 text-xs">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-secondary-orange" />
                  {t(penaltyFormLabels.autoSpread)} ({plan.months})
                </p>
              )}
              {plan.blocked && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {plan.minimalMonths === null ? t(penaltyFormLabels.noCapacity) : `${t(penaltyFormLabels.blocked)} (${t(penaltyFormLabels.suggested)}: ${plan.minimalMonths})`}
                </p>
              )}
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-1 py-1 text-start font-medium">#</th>
                    <th className="px-1 py-1 text-start font-medium" />
                    <th className="px-1 py-1 text-end font-medium" />
                    <th className="px-1 py-1 text-end font-medium">{t(penaltyFormLabels.capacity)}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((r) => (
                    <tr key={r.seqNo} className="border-t border-border">
                      <td className="px-1 py-1.5 tabular-nums text-muted-foreground">{r.seqNo}</td>
                      <td className="px-1 py-1.5"><bdi dir="ltr">{formatPeriod(r.duePeriodId)}</bdi></td>
                      <td className={`px-1 py-1.5 text-end ${r.exceeds ? "font-medium text-destructive" : ""}`}><MoneyCell value={r.amount} /></td>
                      <td className="px-1 py-1.5 text-end"><MoneyCell value={r.capacity} muted /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  );
}
