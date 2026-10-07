"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmployeeSelect } from "@/components/employee-select";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { OptionSelect } from "@/components/payroll/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { runFormLabels, runTypeLabels } from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { FieldErrors, PayrollProfile, PayrollRun, PeriodRow, RunType } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";
import { cn } from "@/lib/utils";

export default function NewRunPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");
  const periods = useApi<PeriodRow[]>("/api/payroll/periods");
  const employees = useApi<Employee[]>("/api/hr/employees");

  const [profileId, setProfileId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [runType, setRunType] = useState<RunType>("Regular");
  const [departments, setDepartments] = useState<string[]>([]);
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const openPeriods = useMemo(
    () => (periods.data ?? []).filter((p) => p.profileId === profileId && p.status === "Open").sort((a, b) => b.periodKey.localeCompare(a.periodKey)),
    [periods.data, profileId]
  );
  const deptOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (employees.data ?? []).forEach((e) => seen.set(e.department, locale === "ar" ? e.department : e.departmentEn));
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [employees.data, locale]);
  const ccOptions = useMemo(() => [...new Set((employees.data ?? []).map((e) => e.costCenter))].sort(), [employees.data]);
  const empName = (id: string) => {
    const e = employees.data?.find((x) => x.id === id);
    return e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : id;
  };

  if (!can("payroll.run", "create")) return <EmptyState title={configCommon.readOnly} />;

  const message = (key: string) => (errors[key] ? t(errors[key].message) : undefined);
  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  async function submit() {
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const created = await apiFetch<PayrollRun>("/api/payroll/runs", {
        method: "POST",
        body: { profileId, payrollPeriodId: periodId, runType, scopeFilter: { departments, costCenters, employeeIds }, note },
      });
      router.push(`/payroll/runs/${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-xs transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted");

  return (
    <div className="space-y-5">
      <PageHeader title={runFormLabels.title} description={runFormLabels.description} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(runFormLabels.title)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(runFormLabels.profile)} required error={message("profileId")}>
                <OptionSelect
                  value={profileId}
                  onChange={(v) => {
                    setProfileId(v);
                    setPeriodId("");
                  }}
                  placeholder={t(runFormLabels.pickProfile)}
                  options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))}
                />
              </FormField>
              <FormField label={t(runFormLabels.period)} required error={message("payrollPeriodId")} hint={profileId && openPeriods.length === 0 ? t(runFormLabels.noOpenPeriod) : undefined}>
                <OptionSelect
                  value={periodId}
                  onChange={setPeriodId}
                  invalid={!!errors.payrollPeriodId}
                  disabled={!profileId}
                  placeholder={t(runFormLabels.pickPeriod)}
                  options={openPeriods.map((p) => ({ value: p.id, label: formatPeriod(p.periodKey) }))}
                />
              </FormField>
              <FormField label={t(runFormLabels.runType)} required error={message("runType")} className="sm:col-span-2" hint={t(runType === "Regular" ? runFormLabels.regularHint : runFormLabels.supplementaryHint)}>
                <OptionSelect value={runType} onChange={(v) => setRunType(v as RunType)} invalid={!!errors.runType} options={Object.entries(runTypeLabels).map(([value, label]) => ({ value, label: t(label) }))} />
              </FormField>
            </div>
          </DetailSection>

          <DetailSection title={t(runFormLabels.scope)}>
            <p className="mb-3 text-xs text-muted-foreground">{t(runFormLabels.scopeHint)}</p>
            {message("scopeFilter") && <p className="mb-3 text-xs text-destructive">{message("scopeFilter")}</p>}
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">{t(runFormLabels.departments)}</p>
                <div className="flex flex-wrap gap-2">
                  {deptOptions.map((d) => (
                    <button key={d.value} type="button" className={chip(departments.includes(d.value))} onClick={() => toggle(departments, setDepartments, d.value)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t(runFormLabels.costCenters)}</p>
                <div className="flex flex-wrap gap-2">
                  {ccOptions.map((c) => (
                    <button key={c} type="button" className={chip(costCenters.includes(c))} onClick={() => toggle(costCenters, setCostCenters, c)}>
                      <bdi dir="ltr">{c}</bdi>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t(runFormLabels.employees)}</p>
                <div className="max-w-sm">
                  <EmployeeSelect
                    value={pick}
                    employees={employees.data ?? undefined}
                    placeholder={t(runFormLabels.addEmployee)}
                    onValueChange={(v) => {
                      if (v && !employeeIds.includes(v)) setEmployeeIds([...employeeIds, v]);
                      setPick("");
                    }}
                  />
                </div>
                {employeeIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {employeeIds.map((id) => (
                      <span key={id} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
                        {empName(id)}
                        <button type="button" aria-label="remove" onClick={() => setEmployeeIds(employeeIds.filter((x) => x !== id))}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <FormField label={t(runFormLabels.note)}>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </FormField>
            </div>
          </DetailSection>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={submit} disabled={busy || !profileId || !periodId}>{t(runFormLabels.create)}</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/payroll/runs")} disabled={busy}>{t(commonLabels.cancel)}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
