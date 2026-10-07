"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { MultiSelectChips } from "@/components/chip-list-editor";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { EffectiveHistory } from "@/components/payroll/effective-history";
import { OptionSelect } from "@/components/payroll/option-select";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon, statutoryLabels, taxLabels } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { dayBefore, hasErrors, validateEffectiveFrom } from "@/lib/payroll/config-validation";
import { formatDate, formatPercent } from "@/lib/payroll/format";
import type {
  EffectiveStatus,
  FieldErrors,
  GlAccount,
  PayrollComponent,
  PayrollProfile,
  PensionConfiguration,
  SocialSecurityConfiguration,
} from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

type Kind = "pension" | "socialSecurity";
type Record_ = (PensionConfiguration | SocialSecurityConfiguration) & { status: EffectiveStatus };

const ENDPOINT: Record<Kind, string> = {
  pension: "/api/payroll/config/pension-configs",
  socialSecurity: "/api/payroll/config/social-security-configs",
};

/** Effective-dated history + detail + "new record" form for pension (government) or social security (private). */
export function StatutoryScreen({ kind }: { kind: Kind }) {
  const { t } = useLocale();
  const can = useCan();
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");
  const components = useApi<PayrollComponent[]>("/api/payroll/config/components");
  const gl = useApi<GlAccount[]>("/api/payroll/config/gl-accounts");

  // Pension belongs to the government profile, social security to the private one (study 6).
  const profile = profiles.data?.find((p) => p.code === (kind === "pension" ? "GOVERNMENT_IQ" : "PRIVATE_IQ"));
  const records = useApi<Record_[]>(profile ? `${ENDPOINT[kind]}?profileId=${profile.id}` : null);
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = records.data?.find((r) => r.id === selectedId) ?? records.data?.find((r) => r.status === "Current") ?? records.data?.[0];
  const compName = (code: string) => {
    const c = components.data?.find((x) => x.code === code);
    return c ? t(c.name) : code;
  };
  const glLabel = (code: string) => {
    const a = gl.data?.find((x) => x.code === code);
    return `${code}${a ? ` — ${t(a.name)}` : ""}`;
  };
  const ss = kind === "socialSecurity" ? (selected as SocialSecurityConfiguration | undefined) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{profile ? t(profile.name) : ""}</p>
        {can("payroll.config", "create") && (
          <Button type="button" size="sm" onClick={() => setCreating(true)} disabled={!selected}>
            <Plus className="size-4" />
            {t(taxLabels.newRecord)}
          </Button>
        )}
      </div>

      {records.loading && <p className="py-10 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
      {records.error && <p className="py-10 text-center text-sm text-destructive">{t(commonLabels.loadError)}</p>}

      {records.data && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DetailSection title={t(taxLabels.history)} className="h-fit">
            <EffectiveHistory
              records={records.data.map((r) => ({
                id: r.id,
                effectiveFrom: r.effectiveFrom,
                effectiveTo: r.effectiveTo,
                status: r.status,
                summary: `${formatPercent(r.employeeRate)} / ${formatPercent(r.employerRate)}`,
                notes: r.notes,
              }))}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />
          </DetailSection>

          {selected && (
            <div className="space-y-5 lg:col-span-2">
              <DetailSection title={t(taxLabels.currentSettings)}>
                <DetailGrid>
                  <DetailField label={t(statutoryLabels.employeeRate)}><bdi dir="ltr">{formatPercent(selected.employeeRate)}</bdi></DetailField>
                  <DetailField label={t(statutoryLabels.employerRate)}><bdi dir="ltr">{formatPercent(selected.employerRate)}</bdi></DetailField>
                  <DetailField label={t(configCommon.effectiveFrom)}><bdi dir="ltr">{formatDate(selected.effectiveFrom)}</bdi></DetailField>
                  <DetailField label={t(configCommon.effectiveTo)}>{selected.effectiveTo ? <bdi dir="ltr">{formatDate(selected.effectiveTo)}</bdi> : t(configCommon.openEnded)}</DetailField>
                  {ss && <DetailField label={t(statutoryLabels.establishmentFile)}><bdi dir="ltr" className="font-mono text-xs">{ss.establishmentFileNo}</bdi></DetailField>}
                  {ss && <DetailField label={t(statutoryLabels.remittanceCycle)}>{t(ss.remittanceCycle === "Monthly" ? statutoryLabels.monthly : statutoryLabels.quarterly)}</DetailField>}
                  <DetailField label={t(statutoryLabels.baseComponents)} className="sm:col-span-2 lg:col-span-3">
                    <div className="flex flex-wrap gap-1">
                      {selected.baseComponentCodes.map((code) => <StatusBadge key={code} tone="info" label={compName(code)} />)}
                    </div>
                  </DetailField>
                </DetailGrid>
              </DetailSection>

              <DetailSection title={t(configCommon.payableAccount)}>
                <DetailGrid>
                  <DetailField label={t(statutoryLabels.employeePayable)}>{glLabel(selected.employeePayableAccountCode)}</DetailField>
                  <DetailField label={t(statutoryLabels.employerExpense)}>{glLabel(selected.employerExpenseAccountCode)}</DetailField>
                  <DetailField label={t(statutoryLabels.employerPayable)}>{glLabel(selected.employerPayableAccountCode)}</DetailField>
                </DetailGrid>
              </DetailSection>

              {ss && (
                <DetailSection title={t(statutoryLabels.activityOverrides)}>
                  {ss.activityRateOverrides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {ss.activityRateOverrides.map((o) => (
                        <li key={o.id} className="flex justify-between gap-3">
                          <span>{t(o.activity)}</span>
                          <bdi dir="ltr" className="font-medium">{formatPercent(o.employerRate)}</bdi>
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailSection>
              )}

              {selected.notes && (
                <DetailSection title={t(statutoryLabels.law)}>
                  <p className="text-sm">{t(selected.notes)}</p>
                </DetailSection>
              )}
            </div>
          )}
        </div>
      )}

      {creating && selected && profile && (
        <NewStatutoryModal
          kind={kind}
          base={selected}
          existing={records.data ?? []}
          components={components.data ?? []}
          accounts={gl.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setSelectedId(id);
            records.reload();
          }}
        />
      )}
    </div>
  );
}

function NewStatutoryModal({
  kind,
  base,
  existing,
  components,
  accounts,
  onClose,
  onCreated,
}: {
  kind: Kind;
  base: Record_;
  existing: Record_[];
  components: PayrollComponent[];
  accounts: GlAccount[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useLocale();
  const baseSs = kind === "socialSecurity" ? (base as SocialSecurityConfiguration) : undefined;

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [employeeRate, setEmployeeRate] = useState(String(base.employeeRate));
  const [employerRate, setEmployerRate] = useState(String(base.employerRate));
  const [baseCodes, setBaseCodes] = useState(base.baseComponentCodes);
  const [employeePayable, setEmployeePayable] = useState(base.employeePayableAccountCode);
  const [employerExpense, setEmployerExpense] = useState(base.employerExpenseAccountCode);
  const [employerPayable, setEmployerPayable] = useState(base.employerPayableAccountCode);
  const [fileNo, setFileNo] = useState(baseSs?.establishmentFileNo ?? "");
  const [cycle, setCycle] = useState(baseSs?.remittanceCycle ?? "Monthly");
  const [overrides, setOverrides] = useState(baseSs?.activityRateOverrides ?? []);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);
  const accountOptions = accounts.map((a) => ({ value: a.code, label: `${a.code} — ${t(a.name)}` }));
  const earningOptions = components.filter((c) => c.componentType === "Earning").map((c) => ({ value: c.code, label: `${c.code} — ${t(c.name)}` }));
  const previous = [...existing].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  async function submit() {
    const local: FieldErrors = validateEffectiveFrom(effectiveFrom, existing);
    for (const [key, value] of [["employeeRate", employeeRate], ["employerRate", employerRate]] as const) {
      const n = Number(value);
      if (value === "" || Number.isNaN(n) || n < 0 || n > 100) {
        local[key] = { rule: "C-9", message: { ar: "النسبة بين 0 و100", en: "Rate must be between 0 and 100" } };
      }
    }
    setErrors(local);
    if (hasErrors(local)) return;
    setSaving(true);
    try {
      const created = await apiFetch<{ id: string }>(ENDPOINT[kind], {
        method: "POST",
        body: {
          profileId: base.profileId,
          effectiveFrom,
          employeeRate: Number(employeeRate),
          employerRate: Number(employerRate),
          baseComponentCodes: baseCodes,
          employeePayableAccountCode: employeePayable,
          employerExpenseAccountCode: employerExpense,
          employerPayableAccountCode: employerPayable,
          ...(kind === "socialSecurity" ? { establishmentFileNo: fileNo, remittanceCycle: cycle, activityRateOverrides: overrides } : {}),
        },
      });
      onCreated(created.id);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      title={t(taxLabels.newRecord)}
      description={t(taxLabels.newRecordHint)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{t(commonLabels.cancel)}</Button>
          <Button type="button" onClick={submit} disabled={saving}>{saving ? t(configCommon.saving) : t(taxLabels.saveRecord)}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t(configCommon.effectiveFrom)} required error={err("effectiveFrom")} hint={effectiveFrom && previous ? `${t(taxLabels.closesPrevious)} ${formatDate(dayBefore(effectiveFrom))}` : undefined} className="sm:col-span-2">
          <Input type="date" dir="ltr" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-invalid={!!errors.effectiveFrom} />
        </FormField>
        <FormField label={t(statutoryLabels.employeeRate)} error={err("employeeRate")} required>
          <Input type="number" step="any" dir="ltr" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} aria-invalid={!!errors.employeeRate} />
        </FormField>
        <FormField label={t(statutoryLabels.employerRate)} error={err("employerRate")} required>
          <Input type="number" step="any" dir="ltr" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} aria-invalid={!!errors.employerRate} />
        </FormField>
        <FormField label={t(statutoryLabels.baseComponents)} className="sm:col-span-2">
          <MultiSelectChips
            options={earningOptions}
            selected={baseCodes}
            onAdd={(v) => setBaseCodes([...baseCodes, v])}
            onRemove={(v) => setBaseCodes(baseCodes.filter((c) => c !== v))}
            placeholder={t(statutoryLabels.baseComponents)}
            removeLabel={t(commonLabels.delete)}
            emptyLabel={t(commonLabels.noResults)}
          />
        </FormField>
        <FormField label={t(statutoryLabels.employeePayable)}>
          <SearchableSelect value={employeePayable} onValueChange={setEmployeePayable} options={accountOptions} />
        </FormField>
        <FormField label={t(statutoryLabels.employerExpense)}>
          <SearchableSelect value={employerExpense} onValueChange={setEmployerExpense} options={accountOptions} />
        </FormField>
        <FormField label={t(statutoryLabels.employerPayable)}>
          <SearchableSelect value={employerPayable} onValueChange={setEmployerPayable} options={accountOptions} />
        </FormField>
        {kind === "socialSecurity" && (
          <>
            <FormField label={t(statutoryLabels.establishmentFile)}>
              <Input dir="ltr" className="font-mono" value={fileNo} onChange={(e) => setFileNo(e.target.value)} />
            </FormField>
            <FormField label={t(statutoryLabels.remittanceCycle)}>
              <OptionSelect
                value={cycle}
                onChange={(v) => setCycle(v as "Monthly" | "Quarterly")}
                options={[
                  { value: "Monthly", label: t(statutoryLabels.monthly) },
                  { value: "Quarterly", label: t(statutoryLabels.quarterly) },
                ]}
              />
            </FormField>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t(statutoryLabels.activityOverrides)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrides([...overrides, { id: `ao${Date.now().toString(36)}`, activity: { ar: "", en: "" }, employerRate: 0 }])}
                >
                  <Plus className="size-4" />
                  {t(statutoryLabels.addOverride)}
                </Button>
              </div>
              {overrides.map((o) => (
                <div key={o.id} className="grid grid-cols-[1fr_1fr_6rem_2rem] items-center gap-2">
                  <Input dir="rtl" placeholder="AR" value={o.activity.ar} onChange={(e) => setOverrides(overrides.map((x) => (x.id === o.id ? { ...x, activity: { ...x.activity, ar: e.target.value } } : x)))} />
                  <Input dir="ltr" placeholder="EN" value={o.activity.en} onChange={(e) => setOverrides(overrides.map((x) => (x.id === o.id ? { ...x, activity: { ...x.activity, en: e.target.value } } : x)))} />
                  <Input type="number" step="any" dir="ltr" value={o.employerRate} onChange={(e) => setOverrides(overrides.map((x) => (x.id === o.id ? { ...x, employerRate: Number(e.target.value) } : x)))} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t(commonLabels.delete)} onClick={() => setOverrides(overrides.filter((x) => x.id !== o.id))}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
