"use client";

import { useMemo, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { MoneyCell } from "@/components/payroll/money-cell";
import { OptionSelect } from "@/components/payroll/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { compDetailLabels } from "@/lib/i18n/payroll-compensation-labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import type { ConfigBundle } from "@/lib/payroll/preview";
import { parseGradeStepId, type FieldErrors } from "@/lib/payroll/types";

/** Annual-increment (E-9) and promotion (E-10) helpers for government staff — each creates a new record. */
export function AdjustModal({
  kind,
  employeeId,
  currentGradeStepId,
  bundle,
  onClose,
  onDone,
}: {
  kind: "increment" | "promotion";
  employeeId: string;
  currentGradeStepId: string;
  bundle: ConfigBundle | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const from = parseGradeStepId(currentGradeStepId);
  const steps = useMemo(() => bundle?.gradeScales.flatMap((s) => s.steps) ?? [], [bundle]);
  const nominalOf = (grade: number, step: number) => steps.find((s) => s.grade === grade && s.step === step)?.nominalSalary;

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reason, setReason] = useState("");
  const [targetGrade, setTargetGrade] = useState(from && from.grade > 1 ? String(from.grade - 1) : "");
  const [targetStep, setTargetStep] = useState("1");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  if (!from) return null;
  const target =
    kind === "increment"
      ? { grade: from.grade, step: from.step + 1 }
      : { grade: Number(targetGrade) || from.grade, step: Number(targetStep) || 1 };
  const fromNominal = nominalOf(from.grade, from.step);
  const toNominal = nominalOf(target.grade, target.step);
  const err = Object.values(errors)[0];

  async function submit() {
    if (!effectiveFrom) {
      setErrors({ effectiveFrom: { rule: "E-1", message: { ar: "تاريخ السريان مطلوب", en: "Effective-from date is required" } } });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/payroll/compensations/${employeeId}/adjust`, {
        method: "POST",
        body: { kind, effectiveFrom, reason, targetGrade: Number(targetGrade), targetStep: Number(targetStep) },
      });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      else setErrors({ form: { rule: "", message: { ar: (error as Error).message, en: (error as Error).message } } });
      setSaving(false);
    }
  }

  const gradeOptions = Array.from({ length: from.grade - 1 }, (_, i) => String(i + 1)).map((g) => ({ value: g, label: g }));

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={t(kind === "increment" ? compDetailLabels.incrementTitle : compDetailLabels.promotionTitle)}
      description={t(kind === "increment" ? compDetailLabels.incrementBody : compDetailLabels.promotionBody)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{t(commonLabels.cancel)}</Button>
          <Button type="button" onClick={submit} disabled={saving}>{saving ? t(configCommon.saving) : t(compDetailLabels.apply)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          <span>
            {t(compDetailLabels.from)}: <bdi dir="ltr" className="font-semibold">{from.grade}/{from.step}</bdi>
            {fromNominal != null && <> · <MoneyCell value={fromNominal} /></>}
          </span>
          <span className="text-muted-foreground">→</span>
          <span>
            {t(compDetailLabels.to)}: <bdi dir="ltr" className="font-semibold">{target.grade}/{target.step}</bdi>
            {toNominal != null && <> · <MoneyCell value={toNominal} /></>}
          </span>
        </div>

        {kind === "promotion" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(compDetailLabels.targetGrade)}>
              <OptionSelect value={targetGrade} onChange={setTargetGrade} options={gradeOptions} />
            </FormField>
            <FormField label={t(compDetailLabels.targetStep)}>
              <Input type="number" min={1} max={11} dir="ltr" value={targetStep} onChange={(e) => setTargetStep(e.target.value)} />
            </FormField>
          </div>
        )}

        <FormField label={t(configCommon.effectiveFrom)} required error={errors.effectiveFrom ? `${t(errors.effectiveFrom.message)} (${errors.effectiveFrom.rule})` : undefined}>
          <Input type="date" dir="ltr" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-invalid={!!errors.effectiveFrom} />
        </FormField>
        <FormField label={t(compDetailLabels.reason)}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        {err && !errors.effectiveFrom && (
          <p role="alert" className="text-sm text-destructive">
            {t(err.message)} {err.rule && <>({err.rule})</>}
          </p>
        )}
      </div>
    </Modal>
  );
}
