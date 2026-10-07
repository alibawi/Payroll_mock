"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { DetailSection } from "@/components/payroll/detail-section";
import { EffectiveHistory } from "@/components/payroll/effective-history";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon, exemptionKindLabels, taxLabels } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { dayBefore, hasErrors, validateBrackets, validateEffectiveFrom } from "@/lib/payroll/config-validation";
import { formatDate, formatPercent } from "@/lib/payroll/format";
import { computeIncomeTax } from "@/lib/payroll/tax";
import type { EffectiveStatus, FieldErrors, PayrollProfile, TaxBracket, TaxConfiguration, TaxExemption } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

type TaxRecord = TaxConfiguration & { status: EffectiveStatus };

export function TaxScreen() {
  const { t } = useLocale();
  const can = useCan();
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");
  const [profileId, setProfileId] = useState<string>("");
  const activeProfile = profileId || profiles.data?.[0]?.id || "";
  const records = useApi<TaxRecord[]>(activeProfile ? `/api/payroll/config/tax-configs?profileId=${activeProfile}` : null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const selected = records.data?.find((r) => r.id === selectedId) ?? records.data?.find((r) => r.status === "Current") ?? records.data?.[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={activeProfile} onValueChange={(v) => { setProfileId(String(v)); setSelectedId(""); }}>
          <TabsList>
            {(profiles.data ?? []).map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {t(p.name)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
            {records.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(taxLabels.noRecords)}</p>
            ) : (
              <EffectiveHistory
                records={records.data.map((r) => ({
                  id: r.id,
                  effectiveFrom: r.effectiveFrom,
                  effectiveTo: r.effectiveTo,
                  status: r.status,
                  summary: `${r.brackets.length} ${t(taxLabels.brackets)}`,
                  notes: r.notes,
                }))}
                selectedId={selected?.id}
                onSelect={setSelectedId}
              />
            )}
          </DetailSection>

          {selected && (
            <div className="space-y-5 lg:col-span-2">
              <DetailSection title={t(taxLabels.brackets)} actions={<span className="text-xs text-muted-foreground">{t(selected.calcBasis === "MonthlyDirect" ? taxLabels.monthlyDirect : taxLabels.annualized)}</span>}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(taxLabels.from)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(taxLabels.to)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(taxLabels.rate)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.brackets.map((b) => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-2 py-2"><MoneyCell value={b.fromAmount} currency={false} /></td>
                        <td className="px-2 py-2">{b.toAmount == null ? t(taxLabels.unbounded) : <MoneyCell value={b.toAmount} currency={false} />}</td>
                        <td className="px-2 py-2 tabular-nums"><bdi dir="ltr">{formatPercent(b.rate)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DetailSection>

              <DetailSection title={t(taxLabels.exemptions)}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">{t(configCommon.type)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(taxLabels.amount)}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t(taxLabels.monthlyEquivalent)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.exemptions.map((e) => (
                      <tr key={e.id} className="border-t border-border">
                        <td className="px-2 py-2">{t(exemptionKindLabels[e.kind])}</td>
                        <td className="px-2 py-2"><MoneyCell value={e.annualAmount} /></td>
                        <td className="px-2 py-2"><MoneyCell value={Math.round(e.annualAmount / 12)} muted /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DetailSection>

              <TaxCalculator config={selected} />
            </div>
          )}
        </div>
      )}

      {creating && selected && (
        <NewTaxRecordModal
          base={selected}
          existing={records.data ?? []}
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

function TaxCalculator({ config }: { config: TaxConfiguration }) {
  const { t } = useLocale();
  const [base, setBase] = useState<number | null>(789000);
  const [married, setMarried] = useState(true);
  const [children, setChildren] = useState(3);
  const [ageOver63, setAgeOver63] = useState(false);
  const [disability, setDisability] = useState(false);

  const result = useMemo(
    () => computeIncomeTax(base ?? 0, config, { married, children, ageOver63, disability }),
    [base, config, married, children, ageOver63, disability]
  );

  return (
    <DetailSection title={t(taxLabels.calculator)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t(taxLabels.calcInput)} hint={t(taxLabels.calcHint)}>
          <MoneyInput value={base} onChange={setBase} />
        </FormField>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={married} onCheckedChange={(c) => setMarried(c === true)} />
            {t(taxLabels.married)}
          </label>
          <label className="flex items-center gap-2">
            {t(taxLabels.children)}
            <Input type="number" min={0} max={10} dir="ltr" className="h-8 w-16" value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={ageOver63} onCheckedChange={(c) => setAgeOver63(c === true)} />
            {t(taxLabels.ageOver63)}
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={disability} onCheckedChange={(c) => setDisability(c === true)} />
            {t(taxLabels.disability)}
          </label>
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t(taxLabels.calcExemptions)}</p>
          <ul className="space-y-1">
            {result.exemptions.map((e) => (
              <li key={e.kind} className="flex justify-between gap-3">
                <span>
                  {t(exemptionKindLabels[e.kind])}
                  {e.times > 1 && <bdi dir="ltr"> × {e.times}</bdi>}
                </span>
                <MoneyCell value={-Math.round(e.monthly)} parens muted />
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-border pt-1 font-medium">
              <span>{t(taxLabels.taxableAfter)}</span>
              <MoneyCell value={Math.round(result.taxableAfterExemptions)} bold />
            </li>
          </ul>
        </div>

        {result.steps.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground">{t(taxLabels.noTax)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.step)}</th>
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.slice)}</th>
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.rate)}</th>
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.taxOfSlice)}</th>
              </tr>
            </thead>
            <tbody>
              {result.steps.map((s) => (
                <tr key={s.bracketId} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <bdi dir="ltr" className="text-xs text-muted-foreground">
                      {s.from.toLocaleString("en-US")} – {s.to == null ? "∞" : s.to.toLocaleString("en-US")}
                    </bdi>
                  </td>
                  <td className="px-2 py-1.5"><MoneyCell value={Math.round(s.slice)} currency={false} /></td>
                  <td className="px-2 py-1.5 tabular-nums"><bdi dir="ltr">{formatPercent(s.rate)}</bdi></td>
                  <td className="px-2 py-1.5"><MoneyCell value={Math.round(s.tax)} currency={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2.5">
          <span className="font-medium">{t(taxLabels.taxDue)}</span>
          <span className="flex items-baseline gap-3">
            <span className="text-xs text-muted-foreground">
              {t(taxLabels.effectiveRate)}: <bdi dir="ltr">{formatPercent(Math.round(result.effectiveRate * 100) / 100)}</bdi>
            </span>
            <MoneyCell value={result.tax} bold className="text-base" />
          </span>
        </div>
      </div>
    </DetailSection>
  );
}

type BracketDraft = { id: string; toAmount: number | null; rate: number | null };

function NewTaxRecordModal({
  base,
  existing,
  onClose,
  onCreated,
}: {
  base: TaxRecord;
  existing: TaxRecord[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useLocale();
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [calcBasis, setCalcBasis] = useState(base.calcBasis);
  const [rows, setRows] = useState<BracketDraft[]>(
    base.brackets.map((b) => ({ id: b.id, toAmount: b.toAmount, rate: b.rate }))
  );
  const [exemptions, setExemptions] = useState<TaxExemption[]>(base.exemptions);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const brackets: TaxBracket[] = rows.map((r, i) => ({
    id: r.id,
    fromAmount: i === 0 ? 0 : (rows[i - 1].toAmount ?? 0),
    toAmount: i === rows.length - 1 ? null : r.toAmount,
    rate: r.rate ?? 0,
  }));
  const previous = existing.filter((e) => e.profileId === base.profileId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);

  async function submit() {
    const local: FieldErrors = {
      ...validateEffectiveFrom(effectiveFrom, existing),
      ...validateBrackets(brackets),
    };
    setErrors(local);
    if (hasErrors(local)) return;
    setSaving(true);
    try {
      const created = await apiFetch<{ id: string }>("/api/payroll/config/tax-configs", {
        method: "POST",
        body: { profileId: base.profileId, effectiveFrom, calcBasis, currencyCode: base.currencyCode, brackets, exemptions },
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
          <Button type="button" variant="outline" onClick={onClose}>
            {t(commonLabels.cancel)}
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? t(configCommon.saving) : t(taxLabels.saveRecord)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t(configCommon.effectiveFrom)} required error={err("effectiveFrom")} hint={effectiveFrom && previous ? `${t(taxLabels.closesPrevious)} ${formatDate(dayBefore(effectiveFrom))}` : undefined}>
            <Input type="date" dir="ltr" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-invalid={!!errors.effectiveFrom} />
          </FormField>
          <FormField label={t(taxLabels.calcBasis)}>
            <OptionSelect
              value={calcBasis}
              onChange={(v) => setCalcBasis(v as TaxConfiguration["calcBasis"])}
              options={[
                { value: "MonthlyDirect", label: t(taxLabels.monthlyDirect) },
                { value: "Annualized", label: t(taxLabels.annualized) },
              ]}
            />
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{t(taxLabels.brackets)}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const last = rows.length - 1;
                const prevTo = rows[last - 1]?.toAmount ?? 0;
                const closed = rows.map((r, i) => (i === last ? { ...r, toAmount: r.toAmount ?? prevTo + 500000 } : r));
                setRows([...closed, { id: `b${Date.now().toString(36)}`, toAmount: null, rate: 0 }]);
              }}
            >
              <Plus className="size-4" />
              {t(taxLabels.addBracket)}
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.from)}</th>
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.to)}</th>
                <th className="px-2 py-1 text-start font-medium">{t(taxLabels.rate)}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-2 py-1.5"><MoneyCell value={brackets[i].fromAmount} currency={false} muted /></td>
                    <td className="px-2 py-1.5">
                      {last ? <span className="text-muted-foreground">{t(taxLabels.unbounded)}</span> : (
                        <MoneyInput value={row.toAmount} onChange={(v) => setRows(rows.map((r) => (r.id === row.id ? { ...r, toAmount: v } : r)))} className="w-36" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" step="any" dir="ltr" className="w-24" value={row.rate ?? ""} onChange={(e) => setRows(rows.map((r) => (r.id === row.id ? { ...r, rate: e.target.value === "" ? null : Number(e.target.value) } : r)))} />
                    </td>
                    <td className="px-2 py-1.5">
                      {rows.length > 1 && (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={t(commonLabels.delete)} onClick={() => setRows(rows.filter((r) => r.id !== row.id))}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {errors.brackets && <p className="mt-2 text-xs text-destructive">{err("brackets")}</p>}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{t(taxLabels.exemptions)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {exemptions.map((e) => (
              <FormField key={e.id} label={t(exemptionKindLabels[e.kind])}>
                <MoneyInput value={e.annualAmount} onChange={(v) => setExemptions(exemptions.map((x) => (x.id === e.id ? { ...x, annualAmount: v ?? 0 } : x)))} />
              </FormField>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
