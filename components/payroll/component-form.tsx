"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { FormField } from "@/components/form-field";
import { MultiSelectChips } from "@/components/chip-list-editor";
import { OptionSelect } from "@/components/payroll/option-select";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import {
  calculationMethodLabels,
  componentCategoryLabels,
  componentFlagLabels,
  componentScreenLabels,
  componentTypeLabels,
  configCommon,
} from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { hasErrors, validateComponent } from "@/lib/payroll/config-validation";
import type { FieldErrors, GlAccount, PayrollComponent } from "@/lib/payroll/types";

const FLAGS = ["isTaxable", "isPensionable", "isSocialSecurityBase", "isProratable", "reducesGross"] as const;

type Draft = {
  code: string;
  nameAr: string;
  nameEn: string;
  componentType: string;
  category: string;
  calculationMethod: string;
  percentValue: string;
  baseComponentCodes: string[];
  isTaxable: boolean;
  isPensionable: boolean;
  isSocialSecurityBase: boolean;
  isProratable: boolean;
  reducesGross: boolean;
  expenseAccountCode: string;
  payableAccountCode: string;
  sequence: string;
  isActive: boolean;
};

function toDraft(c?: PayrollComponent): Draft {
  return {
    code: c?.code ?? "",
    nameAr: c?.name.ar ?? "",
    nameEn: c?.name.en ?? "",
    componentType: c?.componentType ?? "",
    category: c?.category ?? "",
    calculationMethod: c?.calculationMethod ?? "",
    percentValue: c?.percentValue != null ? String(c.percentValue) : "",
    baseComponentCodes: c?.baseComponentCodes ?? [],
    isTaxable: c?.isTaxable ?? false,
    isPensionable: c?.isPensionable ?? false,
    isSocialSecurityBase: c?.isSocialSecurityBase ?? false,
    isProratable: c?.isProratable ?? false,
    reducesGross: c?.reducesGross ?? false,
    expenseAccountCode: c?.expenseAccountCode ?? "",
    payableAccountCode: c?.payableAccountCode ?? "",
    sequence: c ? String(c.sequence) : "",
    isActive: c?.isActive ?? true,
  };
}

function toPayload(d: Draft): Partial<PayrollComponent> {
  return {
    code: d.code.trim(),
    name: { ar: d.nameAr.trim(), en: d.nameEn.trim() },
    componentType: (d.componentType || undefined) as PayrollComponent["componentType"],
    category: (d.category || undefined) as PayrollComponent["category"],
    calculationMethod: (d.calculationMethod || undefined) as PayrollComponent["calculationMethod"],
    percentValue: d.percentValue === "" ? null : Number(d.percentValue),
    baseComponentCodes: d.baseComponentCodes,
    isTaxable: d.isTaxable,
    isPensionable: d.isPensionable,
    isSocialSecurityBase: d.isSocialSecurityBase,
    isProratable: d.isProratable,
    reducesGross: d.reducesGross,
    expenseAccountCode: d.expenseAccountCode || null,
    payableAccountCode: d.payableAccountCode || null,
    sequence: d.sequence === "" ? undefined : Number(d.sequence),
    isActive: d.isActive,
  };
}

/** Create / edit form for a payroll component with the C-1…C-3 validation (shared with the API). */
export function ComponentForm({ component }: { component?: PayrollComponent }) {
  const { t } = useLocale();
  const router = useRouter();
  const all = useApi<PayrollComponent[]>("/api/payroll/config/components");
  const gl = useApi<GlAccount[]>("/api/payroll/config/gl-accounts");

  const [draft, setDraft] = useState<Draft>(() => toDraft(component));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = Boolean(component);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const errorOf = (key: string) => {
    const e = errors[key];
    return e ? `${t(e.message)} (${e.rule})` : undefined;
  };

  const accountOptions = useMemo(
    () => (gl.data ?? []).map((a) => ({ value: a.code, label: `${a.code} — ${t(a.name)}` })),
    [gl.data, t]
  );
  const baseOptions = useMemo(
    () =>
      (all.data ?? [])
        .filter((c) => c.id !== component?.id && c.componentType === "Earning")
        .map((c) => ({ value: c.code, label: `${c.code} — ${t(c.name)}` })),
    [all.data, component?.id, t]
  );

  const showBase = draft.calculationMethod === "PercentOfBase" || draft.calculationMethod === "AttendanceDriven";
  const isPercent = draft.calculationMethod === "PercentOfBase";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const payload = toPayload(draft);
    const local = validateComponent(payload, all.data ?? [], component?.id);
    setErrors(local);
    if (hasErrors(local)) return;

    setSaving(true);
    try {
      const saved = await apiFetch<PayrollComponent>(
        isEdit ? `/api/payroll/config/components/${component!.id}` : "/api/payroll/config/components",
        { method: isEdit ? "PATCH" : "POST", body: payload }
      );
      router.push(`/payroll/config/components/${saved.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setSubmitError(t(configCommon.validationFailed));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label={t(configCommon.code)} htmlFor="code" required error={errorOf("code")}>
          <Input
            id="code"
            dir="ltr"
            className="font-mono"
            value={draft.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            aria-invalid={!!errors.code}
          />
        </FormField>
        <FormField label={t(configCommon.nameAr)} htmlFor="nameAr" required error={errorOf("name")}>
          <Input id="nameAr" dir="rtl" value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} aria-invalid={!!errors.name} />
        </FormField>
        <FormField label={t(configCommon.nameEn)} htmlFor="nameEn" required>
          <Input id="nameEn" dir="ltr" value={draft.nameEn} onChange={(e) => set("nameEn", e.target.value)} aria-invalid={!!errors.name} />
        </FormField>
        <FormField label={t(configCommon.type)} htmlFor="componentType" required error={errorOf("componentType")}>
          <OptionSelect
            id="componentType"
            value={draft.componentType}
            onChange={(v) => set("componentType", v)}
            invalid={!!errors.componentType}
            placeholder={t(configCommon.type)}
            options={Object.entries(componentTypeLabels).map(([value, label]) => ({ value, label: t(label) }))}
          />
        </FormField>
        <FormField label={t(configCommon.category)} htmlFor="category" required error={errorOf("category")}>
          <OptionSelect
            id="category"
            value={draft.category}
            onChange={(v) => set("category", v)}
            invalid={!!errors.category}
            placeholder={t(configCommon.category)}
            options={Object.entries(componentCategoryLabels).map(([value, label]) => ({ value, label: t(label) }))}
          />
        </FormField>
        <FormField label={t(configCommon.sequence)} htmlFor="sequence" hint={t(componentScreenLabels.seqHint)}>
          <Input id="sequence" type="number" dir="ltr" value={draft.sequence} onChange={(e) => set("sequence", e.target.value)} />
        </FormField>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <FormField label={t(configCommon.method)} htmlFor="method" required error={errorOf("calculationMethod")}>
          <OptionSelect
            id="method"
            value={draft.calculationMethod}
            onChange={(v) => set("calculationMethod", v)}
            invalid={!!errors.calculationMethod}
            placeholder={t(configCommon.method)}
            options={Object.entries(calculationMethodLabels).map(([value, label]) => ({ value, label: t(label) }))}
          />
        </FormField>
        {isPercent && (
          <FormField label={t(configCommon.percent)} htmlFor="percent" required error={errorOf("percentValue")}>
            <Input
              id="percent"
              type="number"
              step="any"
              dir="ltr"
              value={draft.percentValue}
              onChange={(e) => set("percentValue", e.target.value)}
              aria-invalid={!!errors.percentValue}
            />
          </FormField>
        )}
        {showBase && (
          <FormField
            label={t(configCommon.baseComponents)}
            required={isPercent}
            error={errorOf("baseComponentCodes")}
            hint={isPercent ? t(componentScreenLabels.baseHint) : t(componentScreenLabels.baseHintAttendance)}
            className="sm:col-span-2"
          >
            <MultiSelectChips
              options={baseOptions}
              selected={draft.baseComponentCodes}
              onAdd={(value) => set("baseComponentCodes", [...draft.baseComponentCodes, value])}
              onRemove={(value) => set("baseComponentCodes", draft.baseComponentCodes.filter((c) => c !== value))}
              placeholder={t(configCommon.baseComponents)}
              removeLabel={t(commonLabels.delete)}
              emptyLabel={t(commonLabels.noResults)}
            />
          </FormField>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">{t(configCommon.flags)}</p>
        <p className="text-xs text-muted-foreground">{t(componentScreenLabels.flagsHint)}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLAGS.map((flag) => (
            <label key={flag} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={draft[flag]} onCheckedChange={(checked) => set(flag, checked === true)} />
              {t(componentFlagLabels[flag])}
            </label>
          ))}
        </div>
        {errors.reducesGross && <p className="text-xs text-destructive">{errorOf("reducesGross")}</p>}
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <FormField label={t(configCommon.expenseAccount)}>
          <SearchableSelect
            value={draft.expenseAccountCode}
            onValueChange={(v) => set("expenseAccountCode", v)}
            options={accountOptions}
            placeholder={t(configCommon.noAccount)}
          />
        </FormField>
        <FormField label={t(configCommon.payableAccount)}>
          <SearchableSelect
            value={draft.payableAccountCode}
            onValueChange={(v) => set("payableAccountCode", v)}
            options={accountOptions}
            placeholder={t(configCommon.noAccount)}
          />
        </FormField>
        {!isEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={draft.isActive} onCheckedChange={(checked) => set("isActive", checked === true)} />
            {t(configCommon.active)}
          </label>
        )}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t(configCommon.saving) : t(commonLabels.save)}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t(commonLabels.cancel)}
        </Button>
      </div>
    </form>
  );
}
