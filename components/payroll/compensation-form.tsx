"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { PayslipLineTable } from "@/components/payroll/payslip-line-table";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import {
  compFormLabels,
  maritalLabels,
  paymentMethodLabels,
} from "@/lib/i18n/payroll-compensation-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import { validateCompensation, type CompensationDraft } from "@/lib/payroll/compensation-validation";
import { dayBefore, hasErrors } from "@/lib/payroll/config-validation";
import { formatDate } from "@/lib/payroll/format";
import { computeCompensationPreview, type ConfigBundle } from "@/lib/payroll/preview";
import {
  parseGradeStepId,
  type EmployeeCompensation,
  type EmployeeCompensationComponent,
  type FieldErrors,
  type TaxMaritalStatus,
} from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type OverrideRow = { key: string; componentId: string; amount: number | null; percent: number | null };

const GRADES = Array.from({ length: 10 }, (_, i) => String(i + 1));
const STEPS = Array.from({ length: 11 }, (_, i) => String(i + 1));
const AUTO_CODES = new Set(["NOMINAL_SALARY", "BASIC_SALARY", "SPOUSE_ALLOWANCE", "CHILD_ALLOWANCE"]);

const toMarital = (e: Employee): TaxMaritalStatus =>
  ({ married: "Married", single: "Single", divorced: "Divorced", widowed: "Widowed" })[e.maritalStatus] as TaxMaritalStatus;

/** Assign-new-salary form: dynamic by profile (grade/step vs base wage), overrides editor, live payslip preview. */
export function CompensationForm({
  employee,
  current,
  allRecords,
  bundle,
  minimumWage,
}: {
  employee: Employee;
  current: (EmployeeCompensation & { overrides: EmployeeCompensationComponent[] }) | null;
  allRecords: Pick<EmployeeCompensation, "effectiveFrom" | "effectiveTo">[];
  bundle: ConfigBundle;
  minimumWage: number;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const defaultProfile =
    current?.profileId ??
    bundle.profiles.find((p) => p.code === (employee.employmentType === "Permanent" ? "GOVERNMENT_IQ" : "PRIVATE_IQ"))?.id ??
    "";
  const cell0 = parseGradeStepId(current?.gradeStepId);

  const [profileId, setProfileId] = useState(defaultProfile);
  const [structureId, setStructureId] = useState(current?.salaryStructureId ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [grade, setGrade] = useState(cell0 ? String(cell0.grade) : "");
  const [step, setStep] = useState(cell0 ? String(cell0.step) : "");
  const [baseSalary, setBaseSalary] = useState<number | null>(current?.baseSalary ?? null);
  const [paymentMethod, setPaymentMethod] = useState<"Bank" | "Cash">(current?.paymentMethod ?? "Bank");
  const [bankAccountNo, setBankAccountNo] = useState(current?.bankAccountNo ?? "");
  const [marital, setMarital] = useState<TaxMaritalStatus>(current?.taxMaritalStatus ?? toMarital(employee));
  const [children, setChildren] = useState(String(current?.eligibleChildrenCount ?? employee.numOfChildren));
  const [pensionExempt, setPensionExempt] = useState(current?.isPensionExempt ?? false);
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<OverrideRow[]>(
    (current?.overrides ?? []).map((o) => ({ key: o.id, componentId: o.componentId, amount: o.amount, percent: o.percent }))
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  const profile = bundle.profiles.find((p) => p.id === profileId);
  const government = profile?.code === "GOVERNMENT_IQ";
  const structures = bundle.structures.filter(
    (s) => s.profileId === profileId && (!effectiveFrom || (effectiveFrom >= s.effectiveFrom && (!s.effectiveTo || effectiveFrom <= s.effectiveTo)))
  );
  const structure = bundle.structures.find((s) => s.id === structureId);
  const gradeStepId = government && grade && step ? `gs-${grade}-${step}` : null;
  const stepCell = bundle.gradeScales.flatMap((s) => s.steps).find((s) => s.id === gradeStepId);

  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);
  const byId = useMemo(() => new Map(bundle.components.map((c) => [c.id, c])), [bundle.components]);

  const assignable = (structure?.lines ?? [])
    .map((l) => byId.get(l.componentId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.isActive && c!.componentType === "Earning" && !AUTO_CODES.has(c!.code))
    .filter((c) => !rows.some((r) => r.componentId === c.id));
  const assignableOptions = assignable.map((c) => ({ value: c.id, label: `${c.code} — ${t(c.name)}` }));

  const draft: CompensationDraft = {
    profileId,
    salaryStructureId: structureId,
    effectiveFrom,
    paymentMethod,
    bankAccountNo: paymentMethod === "Bank" ? bankAccountNo : null,
    gradeStepId,
    baseSalary: government ? null : baseSalary,
    taxMaritalStatus: marital,
    eligibleChildrenCount: Number(children),
    overrides: rows.map((r) => ({ componentId: r.componentId, amount: r.amount, percent: r.percent })),
  };

  const preview = useMemo(
    () =>
      computeCompensationPreview(
        { ...draft, isPensionExempt: pensionExempt, date: effectiveFrom || undefined },
        bundle
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileId, structureId, effectiveFrom, paymentMethod, gradeStepId, baseSalary, marital, children, pensionExempt, rows, bundle]
  );

  function changeProfile(next: string) {
    setProfileId(next);
    setStructureId("");
    setRows([]);
    const nextGov = bundle.profiles.find((p) => p.id === next)?.code === "GOVERNMENT_IQ";
    if (nextGov) setBaseSalary(null);
    else {
      setGrade("");
      setStep("");
    }
  }

  function addRow(componentId: string) {
    if (!componentId) return;
    const line = structure?.lines.find((l) => l.componentId === componentId);
    setRows((r) => [...r, { key: `n${Date.now().toString(36)}`, componentId, amount: line?.overrideAmount ?? null, percent: null }]);
    setPick("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const local = validateCompensation(draft, {
      profile,
      structure,
      components: bundle.components,
      employeeRecords: allRecords,
      validGradeStepIds: new Set(bundle.gradeScales.flatMap((s) => s.steps.map((x) => x.id))),
      minimumWage,
    });
    setErrors(local);
    if (hasErrors(local)) return;

    setSaving(true);
    try {
      await apiFetch(`/api/payroll/compensations/${employee.id}`, {
        method: "POST",
        body: { ...draft, isPensionExempt: pensionExempt, changeReason: reason },
      });
      router.push(`/payroll/compensations/${employee.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setSubmitError(t(compFormLabels.validationFailed));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {current && <p className="text-xs text-muted-foreground">{t(compFormLabels.prefilled)}</p>}

        <DetailSection title={t(compFormLabels.title)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(compFormLabels.profile)} required error={err("profileId")}>
              <OptionSelect
                value={profileId}
                onChange={changeProfile}
                invalid={!!errors.profileId}
                options={bundle.profiles.map((p) => ({ value: p.id, label: t(p.name) }))}
              />
            </FormField>
            <FormField label={t(compFormLabels.effectiveFrom)} required error={err("effectiveFrom")} hint={effectiveFrom && current ? `${t(compFormLabels.autoClose)} ${formatDate(dayBefore(effectiveFrom))}` : undefined}>
              <Input type="date" dir="ltr" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-invalid={!!errors.effectiveFrom} />
            </FormField>
            <FormField label={t(compFormLabels.structure)} required error={err("salaryStructureId")} className="sm:col-span-2">
              <OptionSelect
                value={structureId}
                onChange={(v) => {
                  setStructureId(v);
                  setRows((r) => r.filter((x) => bundle.structures.find((s) => s.id === v)?.lines.some((l) => l.componentId === x.componentId)));
                }}
                invalid={!!errors.salaryStructureId}
                placeholder={t(compFormLabels.structure)}
                options={structures.map((s) => ({ value: s.id, label: `${s.code} — ${t(s.name)}` }))}
              />
            </FormField>

            {government ? (
              <>
                <FormField label={t(compFormLabels.grade)} required error={err("gradeStepId")}>
                  <OptionSelect value={grade} onChange={setGrade} options={GRADES.map((g) => ({ value: g, label: g }))} invalid={!!errors.gradeStepId} placeholder={t(compFormLabels.grade)} />
                </FormField>
                <FormField label={t(compFormLabels.step)} required>
                  <OptionSelect value={step} onChange={setStep} options={STEPS.map((g) => ({ value: g, label: g }))} invalid={!!errors.gradeStepId} placeholder={t(compFormLabels.step)} />
                </FormField>
                {stepCell && (
                  <p className="text-sm sm:col-span-2">
                    {t(compFormLabels.nominalHint)}: <MoneyCell value={stepCell.nominalSalary} bold /> · {t({ ar: "العلاوة السنوية", en: "Annual increment" })}: <MoneyCell value={stepCell.annualIncrementAmount} />
                  </p>
                )}
                {errors.baseSalary && <p className="text-xs text-destructive sm:col-span-2">{err("baseSalary")}</p>}
              </>
            ) : (
              <FormField
                label={t(compFormLabels.baseSalary)}
                required
                error={err("baseSalary")}
                hint={`${t(compFormLabels.minHint)}: ${minimumWage.toLocaleString("en-US")}`}
                className="sm:col-span-2"
              >
                <MoneyInput value={baseSalary} onChange={setBaseSalary} invalid={!!errors.baseSalary} />
              </FormField>
            )}
          </div>
        </DetailSection>

        <DetailSection title={t(compFormLabels.paymentMethod)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(compFormLabels.paymentMethod)} required>
              <OptionSelect
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as "Bank" | "Cash")}
                options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </FormField>
            {paymentMethod === "Bank" && (
              <FormField label={t(compFormLabels.bankAccount)} required error={err("bankAccountNo")}>
                <Input dir="ltr" className="font-mono" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} aria-invalid={!!errors.bankAccountNo} />
              </FormField>
            )}
            <FormField label={t(compFormLabels.maritalStatus)} error={err("taxMaritalStatus")} hint={t(compFormLabels.derivedFromHr)}>
              <OptionSelect value={marital} onChange={(v) => setMarital(v as TaxMaritalStatus)} options={Object.entries(maritalLabels).map(([value, label]) => ({ value, label: t(label) }))} />
            </FormField>
            <FormField label={t(compFormLabels.children)} error={err("eligibleChildrenCount")} hint={t(compFormLabels.derivedFromHr)}>
              <Input type="number" min={0} dir="ltr" value={children} onChange={(e) => setChildren(e.target.value)} aria-invalid={!!errors.eligibleChildrenCount} />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={pensionExempt} onCheckedChange={(c) => setPensionExempt(c === true)} />
              {t(compFormLabels.pensionExempt)}
            </label>
            <FormField label={t(compFormLabels.reason)} className="sm:col-span-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
        </DetailSection>

        <DetailSection
          title={t(compFormLabels.overrides)}
          actions={
            structure && (
              <div className="w-64 max-w-full">
                <SearchableSelect value={pick} onValueChange={addRow} options={assignableOptions} placeholder={t(compFormLabels.addComponent)} />
              </div>
            )
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{t(compFormLabels.overridesHint)} {t(compFormLabels.automatic)}.</p>
          {errors.overrides && <p className="mb-2 text-xs text-destructive">{err("overrides")}</p>}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => {
                  const component = byId.get(row.componentId);
                  const isPercent = (structure?.lines.find((l) => l.componentId === row.componentId)?.overrideMethod ?? component?.calculationMethod) === "PercentOfBase";
                  return (
                    <tr key={row.key} className="border-t border-border">
                      <td className="px-2 py-2">
                        <div className="font-medium">{component ? t(component.name) : row.componentId}</div>
                        <bdi dir="ltr" className="font-mono text-[11px] text-muted-foreground">{component?.code}</bdi>
                      </td>
                      <td className="px-2 py-2">
                        {isPercent ? (
                          <Input type="number" step="any" dir="ltr" className="w-24" placeholder={String(component?.percentValue ?? "")} value={row.percent ?? ""} onChange={(e) => setRows(rows.map((r) => (r.key === row.key ? { ...r, percent: e.target.value === "" ? null : Number(e.target.value) } : r)))} />
                        ) : (
                          <MoneyInput value={row.amount} onChange={(v) => setRows(rows.map((r) => (r.key === row.key ? { ...r, amount: v } : r)))} className="w-36" />
                        )}
                      </td>
                      <td className="w-10 px-2 py-2">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={t(compFormLabels.remove)} onClick={() => setRows(rows.filter((r) => r.key !== row.key))}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {structure && assignableOptions.length > 0 && rows.length === 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Plus className="size-3" />{t(compFormLabels.addComponent)}</p>
          )}
        </DetailSection>

        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? t({ ar: "جارٍ الحفظ...", en: "Saving..." }) : t(compFormLabels.submit)}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>{t(commonLabels.cancel)}</Button>
        </div>
      </div>

      <DetailSection title={t(compFormLabels.livePreview)} className="h-fit xl:sticky xl:top-4">
        {preview.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t({ ar: "اختر الملف والهيكل والدرجة/الأجر لتظهر المعاينة", en: "Pick a profile, structure and grade / wage to see the preview" })}</p>
        ) : (
          <PayslipLineTable
            lines={preview.lines}
            showBase={false}
            showSource={false}
            summary={{ grossPay: preview.gross, totalDeductions: preview.employeeStatutory + preview.incomeTax, netPay: preview.net, employerCost: preview.employerCost }}
          />
        )}
      </DetailSection>
    </form>
  );
}
