"use client";

import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { AuditTimeline } from "@/components/payroll/audit-timeline";
import { DetailSection } from "@/components/payroll/detail-section";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { configCommon, gradeLabels } from "@/lib/i18n/payroll-config-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { hasErrors, validateGradeSteps } from "@/lib/payroll/config-validation";
import type { ConfigActivity, FieldErrors, GovtGradeScale, GovtGradeStep } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

/** Editable grade × step grid of a government salary scale (nominal salary + annual increment). */
export function GradeGrid({ scale, onSaved }: { scale: GovtGradeScale; onSaved: () => void }) {
  const { t } = useLocale();
  const can = useCan();
  const canEdit = can("payroll.config", "update");
  const audit = useApi<ConfigActivity[]>(`/api/payroll/config/activity-log?entityType=gradeScale&entityId=${scale.id}`);

  const [steps, setSteps] = useState<GovtGradeStep[]>(scale.steps);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"nominal" | "increment">("nominal");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const stepCount = Math.max(...scale.steps.map((s) => s.step));
  const stepNumbers = Array.from({ length: stepCount }, (_, i) => i + 1);
  const cell = useMemo(() => new Map(steps.map((s) => [`${s.grade}/${s.step}`, s])), [steps]);
  const dirty = JSON.stringify(steps) !== JSON.stringify(scale.steps);

  const update = (grade: number, step: number, changes: Partial<GovtGradeStep>) =>
    setSteps((list) => list.map((s) => (s.grade === grade && s.step === step ? { ...s, ...changes } : s)));

  // Editing a grade's annual increment re-derives that grade's whole nominal ladder (step n = step 1 + (n-1) × increment).
  const applyIncrement = (grade: number, amount: number) =>
    setSteps((list) => {
      const base = list.find((s) => s.grade === grade && s.step === 1)?.nominalSalary ?? 0;
      return list.map((s) =>
        s.grade === grade ? { ...s, annualIncrementAmount: amount, nominalSalary: base + (s.step - 1) * amount } : s
      );
    });

  async function save() {
    const local = validateGradeSteps(steps);
    setErrors(local);
    if (hasErrors(local)) {
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/payroll/config/grade-scales/${scale.id}`, { method: "PATCH", body: { steps } });
      setMessage({ tone: "ok", text: t(configCommon.saved) });
      setEditing(false);
      audit.reload();
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setMessage({ tone: "error", text: t(configCommon.validationFailed) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <DetailSection
        title={t(scale.name)}
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "nominal" | "increment")}>
              <TabsList>
                <TabsTrigger value="nominal">{t(gradeLabels.viewNominal)}</TabsTrigger>
                <TabsTrigger value="increment">{t(gradeLabels.viewIncrement)}</TabsTrigger>
              </TabsList>
            </Tabs>
            {canEdit && !editing && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                {t(gradeLabels.edit)}
              </Button>
            )}
          </div>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          {t(gradeLabels.gradeHigher)} · {t(gradeLabels.highlight)} · {t(gradeLabels.employeesPending)}
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="sticky start-0 z-10 bg-muted px-3 py-2 text-start font-medium text-muted-foreground">
                  {t(gradeLabels.grade)} \ {t(gradeLabels.step)}
                </th>
                {stepNumbers.map((n) => (
                  <th key={n} className="px-2 py-2 text-center font-medium text-muted-foreground tabular-nums">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRADES.map((grade) => (
                <tr key={grade} className="border-t border-border">
                  <th className="sticky start-0 z-10 bg-card px-3 py-2 text-start font-semibold tabular-nums">{grade}</th>
                  {stepNumbers.map((step) => {
                    const c = cell.get(`${grade}/${step}`);
                    if (!c) return <td key={step} />;
                    const invalid = errors[`${grade}/${step}`];
                    const highlighted = grade === 7 && step === 3;
                    const value = view === "nominal" ? c.nominalSalary : c.annualIncrementAmount;
                    return (
                      <td
                        key={step}
                        title={invalid ? t(invalid.message) : undefined}
                        className={cn(
                          "px-1.5 py-1.5 text-center",
                          highlighted && "bg-primary/10 font-semibold",
                          invalid && "bg-destructive/10"
                        )}
                      >
                        {editing ? (
                          <MoneyInput
                            value={value}
                            invalid={!!invalid}
                            className="h-8 w-24 text-xs"
                            onChange={(v) =>
                              view === "nominal"
                                ? update(grade, step, { nominalSalary: v ?? 0 })
                                : applyIncrement(grade, v ?? 0)
                            }
                          />
                        ) : (
                          <MoneyCell value={value} currency={false} className="text-xs" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={save} disabled={!dirty || saving}>
              {saving ? t(configCommon.saving) : t({ ar: "حفظ السلّم", en: "Save scale" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setSteps(scale.steps);
                setErrors({});
                setEditing(false);
                setMessage(null);
              }}
            >
              {t({ ar: "إلغاء التحرير", en: "Cancel editing" })}
            </Button>
          </div>
        )}
        {message && (
          <p role="status" className={cn("mt-3 text-sm", message.tone === "ok" ? "text-secondary-green" : "text-destructive")}>
            {message.text}
          </p>
        )}
      </DetailSection>

      <DetailSection title={t({ ar: "سجل التغييرات", en: "Audit trail" })}>
        <AuditTimeline activity={audit.data ?? []} />
      </DetailSection>
    </div>
  );
}
