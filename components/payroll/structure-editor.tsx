"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { AuditTimeline } from "@/components/payroll/audit-timeline";
import { ComponentTypeBadge } from "@/components/payroll/component-badges";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { calculationMethodLabels, configCommon, structureLabels } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { structureErrors } from "@/lib/payroll/structure-validation";
import type {
  ConfigActivity,
  FieldErrors,
  GlAccount,
  PayrollComponent,
  PayrollProfile,
  SalaryStructure,
  SalaryStructureLine,
} from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

const NONE = "";

/** Create / edit a salary structure and its ordered component lines with per-line overrides. */
export function StructureEditor({ structure }: { structure?: SalaryStructure }) {
  const { t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const isEdit = Boolean(structure);
  const readOnly = !can("payroll.structure", isEdit ? "update" : "create");

  const components = useApi<PayrollComponent[]>("/api/payroll/config/components");
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");
  const structures = useApi<SalaryStructure[]>("/api/payroll/config/structures");
  const gl = useApi<GlAccount[]>("/api/payroll/config/gl-accounts");
  const audit = useApi<ConfigActivity[]>(
    structure ? `/api/payroll/config/activity-log?entityType=structure&entityId=${structure.id}` : null
  );

  const [draft, setDraft] = useState({
    code: structure?.code ?? "",
    nameAr: structure?.name.ar ?? "",
    nameEn: structure?.name.en ?? "",
    profileId: structure?.profileId ?? "",
    effectiveFrom: structure?.effectiveFrom ?? "",
    effectiveTo: structure?.effectiveTo ?? "",
    isActive: structure?.isActive ?? true,
    lines: structure?.lines ?? ([] as SalaryStructureLine[]),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pick, setPick] = useState("");

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);

  const byId = useMemo(() => new Map((components.data ?? []).map((c) => [c.id, c])), [components.data]);
  const accountOptions = (gl.data ?? []).map((a) => ({ value: a.code, label: `${a.code} — ${t(a.name)}` }));
  const profile = profiles.data?.find((p) => p.id === draft.profileId);

  const usedIds = new Set(draft.lines.map((l) => l.componentId));
  const addable = (components.data ?? [])
    .filter((c) => c.isActive && !usedIds.has(c.id))
    .map((c) => ({ value: c.id, label: `${c.code} — ${t(c.name)}` }));

  const patchLine = (id: string, changes: Partial<SalaryStructureLine>) =>
    set("lines", draft.lines.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...draft.lines];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("lines", next);
  };
  const addLine = (componentId: string) => {
    if (!componentId) return;
    set("lines", [
      ...draft.lines,
      {
        id: `sl-${Date.now().toString(36)}`,
        componentId,
        overrideMethod: null,
        overrideAmount: null,
        overridePercent: null,
        overrideExpenseAccountCode: null,
        overridePayableAccountCode: null,
        sequence: (draft.lines.length + 1) * 10,
      },
    ]);
    setPick("");
  };

  async function save() {
    setMessage(null);
    const payload = {
      code: draft.code.trim(),
      name: { ar: draft.nameAr.trim(), en: draft.nameEn.trim() },
      profileId: draft.profileId,
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo || null,
      isActive: draft.isActive,
      lines: draft.lines.map((l, i) => ({ ...l, sequence: (i + 1) * 10 })),
    };
    const local = structureErrors(payload, structures.data ?? [], components.data ?? [], structure?.id);
    setErrors(local);
    if (Object.keys(local).length > 0) {
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
      return;
    }
    setSaving(true);
    try {
      const saved = await apiFetch<SalaryStructure>(
        isEdit ? `/api/payroll/config/structures/${structure!.id}` : "/api/payroll/config/structures",
        { method: isEdit ? "PATCH" : "POST", body: payload }
      );
      if (isEdit) {
        setMessage({ tone: "ok", text: t(configCommon.saved) });
        audit.reload();
        structures.reload();
      } else {
        router.push(`/payroll/config/structures/${saved.id}`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <DetailSection title={t(configCommon.name)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label={t(configCommon.code)} required error={err("code")}>
            <Input dir="ltr" className="font-mono" disabled={readOnly} value={draft.code} onChange={(e) => set("code", e.target.value.toUpperCase())} aria-invalid={!!errors.code} />
          </FormField>
          <FormField label={t(configCommon.nameAr)} required error={err("name")}>
            <Input dir="rtl" disabled={readOnly} value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} aria-invalid={!!errors.name} />
          </FormField>
          <FormField label={t(configCommon.nameEn)} required>
            <Input dir="ltr" disabled={readOnly} value={draft.nameEn} onChange={(e) => set("nameEn", e.target.value)} aria-invalid={!!errors.name} />
          </FormField>
          <FormField label={t(structureLabels.profile)} required error={err("profileId")}>
            <OptionSelect
              value={draft.profileId}
              onChange={(v) => set("profileId", v)}
              disabled={isEdit || readOnly}
              invalid={!!errors.profileId}
              placeholder={t(structureLabels.profile)}
              options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))}
            />
          </FormField>
          <FormField label={t(configCommon.effectiveFrom)} required error={err("effectiveFrom")}>
            <Input type="date" dir="ltr" disabled={readOnly} value={draft.effectiveFrom} onChange={(e) => set("effectiveFrom", e.target.value)} aria-invalid={!!errors.effectiveFrom} />
          </FormField>
          <FormField label={t(configCommon.effectiveTo)} error={err("effectiveTo")}>
            <Input type="date" dir="ltr" disabled={readOnly} value={draft.effectiveTo} onChange={(e) => set("effectiveTo", e.target.value)} aria-invalid={!!errors.effectiveTo} />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={draft.isActive} disabled={readOnly} onCheckedChange={(c) => set("isActive", c === true)} />
            {t(configCommon.active)}
          </label>
        </div>
      </DetailSection>

      <DetailSection
        title={`${t(structureLabels.lines)} (${draft.lines.length})`}
        actions={
          !readOnly && (
            <div className="flex w-72 max-w-full items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchableSelect value={pick} onValueChange={addLine} options={addable} placeholder={t(structureLabels.addLine)} />
              </div>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
            </div>
          )
        }
      >
        {errors.lines && <p className="mb-3 text-xs text-destructive">{err("lines")}</p>}
        {draft.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(structureLabels.noLines)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">#</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.component)}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.overrideMethod)}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.overrideAmount)}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.overridePercent)}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.overrideExpense)}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t(structureLabels.overridePayable)}</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {draft.lines.map((line, index) => {
                  const component = byId.get(line.componentId);
                  return (
                    <tr key={line.id} className="border-t border-border align-top">
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{component ? t(component.name) : line.componentId}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <bdi dir="ltr" className="font-mono text-[11px] text-muted-foreground">
                            {component?.code}
                          </bdi>
                          {component && <ComponentTypeBadge type={component.componentType} />}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <OptionSelect
                          value={line.overrideMethod ?? NONE}
                          onChange={(v) => patchLine(line.id, { overrideMethod: (v || null) as SalaryStructureLine["overrideMethod"] })}
                          disabled={readOnly}
                          placeholder={t(structureLabels.inheritFrom)}
                          options={[
                            { value: NONE, label: t(structureLabels.inheritFrom) },
                            ...Object.entries(calculationMethodLabels).map(([value, label]) => ({ value, label: t(label) })),
                          ]}
                          className="min-w-36"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <MoneyInput value={line.overrideAmount} onChange={(v) => patchLine(line.id, { overrideAmount: v })} disabled={readOnly} className="w-32" />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" step="any" dir="ltr" className="w-20" disabled={readOnly} value={line.overridePercent ?? ""} onChange={(e) => patchLine(line.id, { overridePercent: e.target.value === "" ? null : Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-40">
                          <SearchableSelect value={line.overrideExpenseAccountCode ?? ""} onValueChange={(v) => patchLine(line.id, { overrideExpenseAccountCode: v || null })} options={accountOptions} placeholder={t(structureLabels.inheritFrom)} disabled={readOnly} />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-40">
                          <SearchableSelect value={line.overridePayableAccountCode ?? ""} onValueChange={(v) => patchLine(line.id, { overridePayableAccountCode: v || null })} options={accountOptions} placeholder={t(structureLabels.inheritFrom)} disabled={readOnly} />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {!readOnly && (
                          <div className="flex gap-0.5">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t(structureLabels.moveUp)} disabled={index === 0} onClick={() => move(index, -1)}>
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t(structureLabels.moveDown)} disabled={index === draft.lines.length - 1} onClick={() => move(index, 1)}>
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t(structureLabels.removeLine)} onClick={() => set("lines", draft.lines.filter((l) => l.id !== line.id))}>
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {profile && <p className="mt-3 text-xs text-muted-foreground">{t(profile.name)}</p>}
      </DetailSection>

      {isEdit && (
        <DetailSection title={t({ ar: "سجل التغييرات", en: "Audit trail" })}>
          <AuditTimeline activity={audit.data ?? []} />
        </DetailSection>
      )}

      {!readOnly ? (
        <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? t(configCommon.saving) : t(commonLabels.save)}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/payroll/config/structures")}>
            {t(commonLabels.cancel)}
          </Button>
          {message && (
            <span role="status" className={message.tone === "ok" ? "text-sm text-secondary-green" : "text-sm text-destructive"}>
              {message.text}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t(configCommon.readOnly)}</p>
      )}
    </div>
  );
}
