"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MultiSelectChips } from "@/components/chip-list-editor";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { AuditTimeline } from "@/components/payroll/audit-timeline";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon, profileLabels } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { hasErrors, validateProfile } from "@/lib/payroll/config-validation";
import type {
  ConfigActivity,
  FieldErrors,
  LatenessTier,
  PayrollComponent,
  PayrollProfile,
} from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

const num = (value: string) => (value === "" ? NaN : Number(value));
const numValue = (value: number | null | undefined) => (value == null || Number.isNaN(value) ? "" : String(value));

/** Tabbed editor for a payroll profile: general settings, attendance-penalty policy, regimes, audit. */
export function ProfileEditor({ profile, onSaved }: { profile: PayrollProfile; onSaved: () => void }) {
  const { t } = useLocale();
  const can = useCan();
  const readOnly = !can("payroll.config", "update");

  const components = useApi<PayrollComponent[]>("/api/payroll/config/components");
  const audit = useApi<ConfigActivity[]>(
    `/api/payroll/config/activity-log?entityType=profile&entityId=${profile.id}`
  );

  const [draft, setDraft] = useState<PayrollProfile>(profile);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(profile), [draft, profile]);
  const policy = draft.attendancePenaltyPolicy;

  const patch = (changes: Partial<PayrollProfile>) => setDraft((d) => ({ ...d, ...changes }));
  const patchPolicy = (changes: Partial<PayrollProfile["attendancePenaltyPolicy"]>) =>
    setDraft((d) => ({ ...d, attendancePenaltyPolicy: { ...d.attendancePenaltyPolicy, ...changes } }));
  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);

  const earningOptions = (components.data ?? [])
    .filter((c) => c.componentType === "Earning")
    .map((c) => ({ value: c.code, label: `${c.code} — ${t(c.name)}` }));

  const updateTier = (id: string, changes: Partial<LatenessTier>) =>
    patchPolicy({ latenessTiers: policy.latenessTiers.map((x) => (x.id === id ? { ...x, ...changes } : x)) });
  const addTier = () => {
    const last = [...policy.latenessTiers].sort((a, b) => a.fromMinutes - b.fromMinutes).at(-1);
    const from = last?.toMinutes != null ? last.toMinutes + 1 : (last?.fromMinutes ?? 0) + 15;
    // The previous open-ended tier gets closed so the new one continues it.
    const tiers = policy.latenessTiers.map((x) => (x === last && x.toMinutes == null ? { ...x, toMinutes: from - 1 } : x));
    patchPolicy({
      latenessTiers: [...tiers, { id: `t${Date.now().toString(36)}`, fromMinutes: from, toMinutes: null, dayFraction: 1 }],
    });
  };

  async function save() {
    setMessage(null);
    const local = validateProfile(draft);
    setErrors(local);
    if (hasErrors(local)) {
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/payroll/config/profiles/${profile.id}`, { method: "PATCH", body: draft });
      setMessage({ tone: "ok", text: t(configCommon.saved) });
      onSaved();
      audit.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft(profile);
    setErrors({});
    setMessage(null);
  }

  const [wage, setWage] = useState<number | null>(900000);
  const [workDays, setWorkDays] = useState(26);
  const dayRate = wage && workDays > 0 ? wage / workDays : 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">{t(profileLabels.tabGeneral)}</TabsTrigger>
          <TabsTrigger value="attendance">{t(profileLabels.tabAttendance)}</TabsTrigger>
          <TabsTrigger value="regimes">{t(profileLabels.tabRegimes)}</TabsTrigger>
          <TabsTrigger value="audit">{t(profileLabels.tabAudit)}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="pt-4">
          <DetailSection title={t(profileLabels.tabGeneral)}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t(profileLabels.payFrequency)} error={err("payFrequency")}>
                <OptionSelect
                  value={draft.payFrequency}
                  onChange={(v) => patch({ payFrequency: v as PayrollProfile["payFrequency"] })}
                  disabled={readOnly}
                  invalid={!!errors.payFrequency}
                  options={[
                    { value: "Monthly", label: t(profileLabels.monthly) },
                    { value: "Weekly", label: `${t(profileLabels.weekly)} — ${t(profileLabels.underDevelopment)}`, disabled: true },
                    { value: "Daily", label: `${t(profileLabels.daily)} — ${t(profileLabels.underDevelopment)}`, disabled: true },
                  ]}
                />
              </FormField>
              <FormField label={t(profileLabels.rounding)} error={err("roundingRule")}>
                <OptionSelect
                  value={String(draft.roundingRule)}
                  onChange={(v) => patch({ roundingRule: Number(v) as PayrollProfile["roundingRule"] })}
                  disabled={readOnly}
                  invalid={!!errors.roundingRule}
                  options={["1", "250", "500", "1000"].map((v) => ({ value: v, label: v }))}
                />
              </FormField>
              <FormField label={t(profileLabels.cutoffDay)} error={err("cutoffDay")}>
                <Input type="number" dir="ltr" disabled={readOnly} value={numValue(draft.cutoffDay)} onChange={(e) => patch({ cutoffDay: num(e.target.value) })} />
              </FormField>
              <FormField label={t(profileLabels.currency)}>
                <Input value={draft.currencyCode} disabled dir="ltr" />
              </FormField>
              <FormField label={t(profileLabels.dayRateBasis)}>
                <OptionSelect
                  value={draft.dayRateBasis}
                  onChange={(v) => patch({ dayRateBasis: v as PayrollProfile["dayRateBasis"] })}
                  disabled={readOnly}
                  options={[
                    { value: "WorkingDays", label: t(profileLabels.workingDays) },
                    { value: "CalendarDays", label: t(profileLabels.calendarDays) },
                  ]}
                />
              </FormField>
              <span />
              <FormField label={t(profileLabels.otNormal)} error={err("overtimeMultiplierNormal")}>
                <Input type="number" step="0.05" dir="ltr" disabled={readOnly} value={numValue(draft.overtimeMultiplierNormal)} onChange={(e) => patch({ overtimeMultiplierNormal: num(e.target.value) })} aria-invalid={!!errors.overtimeMultiplierNormal} />
              </FormField>
              <FormField label={t(profileLabels.otRest)}>
                <Input type="number" step="0.05" dir="ltr" disabled={readOnly} value={numValue(draft.overtimeMultiplierRest)} onChange={(e) => patch({ overtimeMultiplierRest: num(e.target.value) })} />
              </FormField>
              <FormField label={t(profileLabels.otHoliday)}>
                <Input type="number" step="0.05" dir="ltr" disabled={readOnly} value={numValue(draft.overtimeMultiplierHoliday)} onChange={(e) => patch({ overtimeMultiplierHoliday: num(e.target.value) })} />
              </FormField>
            </div>
          </DetailSection>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4 pt-4">
          <DetailSection title={t(profileLabels.tabAttendance)}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t(profileLabels.grace)} error={err("graceMinutes")}>
                <Input type="number" dir="ltr" disabled={readOnly} value={numValue(policy.graceMinutes)} onChange={(e) => patchPolicy({ graceMinutes: num(e.target.value) })} aria-invalid={!!errors.graceMinutes} />
              </FormField>
              <FormField label={t(profileLabels.latenessMethod)}>
                <OptionSelect
                  value={policy.latenessMethod}
                  onChange={(v) => patchPolicy({ latenessMethod: v as typeof policy.latenessMethod })}
                  disabled={readOnly}
                  options={[
                    { value: "Tiers", label: t(profileLabels.methodTiers) },
                    { value: "PerMinute", label: t(profileLabels.methodPerMinute) },
                    { value: "CountBased", label: t(profileLabels.methodCountBased) },
                  ]}
                />
              </FormField>
              <FormField label={t(profileLabels.deductionCap)} error={err("maxMonthlyDeductionPercent")}>
                <Input type="number" dir="ltr" disabled={readOnly} value={numValue(policy.maxMonthlyDeductionPercent)} onChange={(e) => patchPolicy({ maxMonthlyDeductionPercent: num(e.target.value) })} aria-invalid={!!errors.maxMonthlyDeductionPercent} />
              </FormField>
              <FormField label={t(profileLabels.overBreach)}>
                <OptionSelect
                  value={policy.overBreachAction}
                  onChange={(v) => patchPolicy({ overBreachAction: v as typeof policy.overBreachAction })}
                  disabled={readOnly}
                  options={[
                    { value: "AutoSpread", label: t(profileLabels.autoSpread) },
                    { value: "Block", label: t(profileLabels.block) },
                  ]}
                />
              </FormField>
              {policy.latenessMethod === "PerMinute" && (
                <FormField label={t(profileLabels.ratePerMinute)} error={err("latenessRatePerMinute")}>
                  <MoneyInput value={policy.latenessRatePerMinute} onChange={(v) => patchPolicy({ latenessRatePerMinute: v })} disabled={readOnly} invalid={!!errors.latenessRatePerMinute} />
                </FormField>
              )}
              {policy.latenessMethod === "CountBased" && (
                <FormField label={t(profileLabels.maxLateEvents)} error={err("maxLateEventsBeforeDayCut")}>
                  <Input type="number" dir="ltr" disabled={readOnly} value={numValue(policy.maxLateEventsBeforeDayCut)} onChange={(e) => patchPolicy({ maxLateEventsBeforeDayCut: num(e.target.value) })} aria-invalid={!!errors.maxLateEventsBeforeDayCut} />
                </FormField>
              )}
              <FormField label={t(profileLabels.absenceBase)} className="sm:col-span-2 lg:col-span-3">
                <MultiSelectChips
                  options={earningOptions}
                  selected={policy.absenceDayRateComponentCodes}
                  onAdd={(v) => patchPolicy({ absenceDayRateComponentCodes: [...policy.absenceDayRateComponentCodes, v] })}
                  onRemove={(v) => patchPolicy({ absenceDayRateComponentCodes: policy.absenceDayRateComponentCodes.filter((c) => c !== v) })}
                  placeholder={t(profileLabels.absenceBase)}
                  removeLabel={t(commonLabels.delete)}
                  emptyLabel={t(commonLabels.noResults)}
                />
              </FormField>
            </div>
          </DetailSection>

          {policy.latenessMethod === "Tiers" && (
            <DetailSection
              title={t(profileLabels.tiers)}
              actions={
                !readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addTier}>
                    <Plus className="size-4" />
                    {t(profileLabels.addTier)}
                  </Button>
                )
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(profileLabels.tierFrom)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(profileLabels.tierTo)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(profileLabels.tierFraction)}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {policy.latenessTiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <Input type="number" dir="ltr" className="w-28" disabled={readOnly} value={numValue(tier.fromMinutes)} onChange={(e) => updateTier(tier.id, { fromMinutes: num(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" dir="ltr" className="w-28" disabled={readOnly} placeholder={t(profileLabels.openEnded)} value={numValue(tier.toMinutes)} onChange={(e) => updateTier(tier.id, { toMinutes: e.target.value === "" ? null : num(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" step="0.05" dir="ltr" className="w-28" disabled={readOnly} value={numValue(tier.dayFraction)} onChange={(e) => updateTier(tier.id, { dayFraction: num(e.target.value) })} />
                        </td>
                        <td className="px-2 py-1.5">
                          {!readOnly && (
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t(commonLabels.delete)} onClick={() => patchPolicy({ latenessTiers: policy.latenessTiers.filter((x) => x.id !== tier.id) })}>
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.latenessTiers && <p className="mt-2 text-xs text-destructive">{err("latenessTiers")}</p>}
            </DetailSection>
          )}

          <DetailSection title={t(profileLabels.preview)}>
            <p className="mb-3 text-xs text-muted-foreground">{t(profileLabels.previewExample)}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={t({ ar: "الأجر الشهري", en: "Monthly wage" })}>
                <MoneyInput value={wage} onChange={setWage} />
              </FormField>
              <FormField label={t({ ar: "أيام العمل", en: "Working days" })}>
                <Input type="number" dir="ltr" value={workDays} onChange={(e) => setWorkDays(Number(e.target.value))} />
              </FormField>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t({ ar: "معدّل اليوم", en: "Day rate" })}</p>
                <MoneyCell value={Math.round(dayRate)} bold />
              </div>
            </div>
            {policy.latenessMethod === "Tiers" && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {[...policy.latenessTiers].sort((a, b) => a.fromMinutes - b.fromMinutes).map((tier) => (
                  <li key={tier.id} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                    <bdi dir="ltr">
                      {tier.fromMinutes}–{tier.toMinutes ?? "∞"} {t({ ar: "د", en: "min" })}
                    </bdi>{" "}
                    → <MoneyCell value={Math.round(dayRate * (Number.isFinite(tier.dayFraction) ? tier.dayFraction : 0))} />
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </TabsContent>

        <TabsContent value="regimes" className="pt-4">
          <DetailSection title={t(profileLabels.tabRegimes)}>
            <div className="space-y-3">
              {(
                [
                  ["enablePension", profileLabels.enablePension],
                  ["enableSocialSecurity", profileLabels.enableSocialSecurity],
                  ["enableIncomeTax", profileLabels.enableIncomeTax],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={draft[key]} disabled={readOnly} onCheckedChange={(checked) => patch({ [key]: checked === true })} />
                  {t(label)}
                </label>
              ))}
              {draft.enablePension && draft.enableSocialSecurity && (
                <StatusBadge tone="warning" label={t(profileLabels.regimeNote)} className="whitespace-normal" />
              )}
              <p className="text-xs text-muted-foreground">{t(profileLabels.regimeNote)}</p>
            </div>
          </DetailSection>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <DetailSection title={t(profileLabels.tabAudit)}>
            <AuditTimeline activity={audit.data ?? []} />
          </DetailSection>
        </TabsContent>
      </Tabs>

      {!readOnly && (
        <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
          <Button type="button" onClick={save} disabled={!dirty || saving}>
            {saving ? t(configCommon.saving) : t(profileLabels.saveChanges)}
          </Button>
          <Button type="button" variant="outline" onClick={discard} disabled={!dirty || saving}>
            {t(profileLabels.discard)}
          </Button>
          {!dirty && !message && <span className="text-xs text-muted-foreground">{t(configCommon.noChanges)}</span>}
          {message && (
            <span role="status" className={message.tone === "ok" ? "text-sm text-secondary-green" : "text-sm text-destructive"}>
              {message.text}
            </span>
          )}
        </div>
      )}
      {readOnly && <p className="text-xs text-muted-foreground">{t(configCommon.readOnly)}</p>}
    </div>
  );
}
