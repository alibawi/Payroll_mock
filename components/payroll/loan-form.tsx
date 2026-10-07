"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AttachmentUploader, type AttachmentItem } from "@/components/attachments";
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
import { loanDetailLabels, loanFormLabels, loanTypeLabels } from "@/lib/i18n/payroll-loan-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { buildSchedule, validateLoanDraft } from "@/lib/payroll/loans";
import { DEPT_HEAD_DEPARTMENT, MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { addMonths, CURRENT_PERIOD, formatPeriod } from "@/lib/payroll/periods";
import type { EmployeeLoan, FieldErrors, LoanType } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

type Cap = { gross: number; capPercent: number; cap: number; total: number; exceeds: boolean } | null;

const PERIODS = Array.from({ length: 12 }, (_, i) => addMonths(CURRENT_PERIOD, i));

/** Loan / advance request form with the live instalment schedule and the monthly-cap warning (L-13). */
export function LoanForm({ loan }: { loan?: EmployeeLoan }) {
  const { t } = useLocale();
  const router = useRouter();
  const { role } = useRole();
  const employees = useApi<Employee[]>("/api/hr/employees?status=active,on_leave");

  const [employeeId, setEmployeeId] = useState(loan?.employeeId ?? (role === "employee" ? MOCK_EMPLOYEE_ID : ""));
  const [loanType, setLoanType] = useState<LoanType>(loan?.loanType ?? "PersonalLoan");
  const [principal, setPrincipal] = useState<number | null>(loan?.principal ?? null);
  const [count, setCount] = useState(String(loan?.installmentCount ?? 6));
  const [interestType, setInterestType] = useState<"None" | "Flat">(loan?.interestType ?? "None");
  const [rate, setRate] = useState(loan?.interestRate != null ? String(loan.interestRate) : "");
  const [firstPeriod, setFirstPeriod] = useState(loan?.firstDeductionPeriodId ?? addMonths(CURRENT_PERIOD, 1));
  const [guarantor, setGuarantor] = useState(loan?.guarantorEmployeeId ?? "");
  const [reason, setReason] = useState(loan?.reason ?? "");
  const [comments, setComments] = useState(loan?.comments ?? "");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; draftId?: string } | null>(null);
  const [cap, setCap] = useState<Cap>(null);

  const isAdvance = loanType === "SalaryAdvance";
  const scopedEmployees = useMemo(
    () => (employees.data ?? []).filter((e) => role !== "deptHead" || e.department === DEPT_HEAD_DEPARTMENT),
    [employees.data, role]
  );

  const draft = {
    employeeId,
    loanType,
    principal: principal ?? 0,
    installmentCount: Number(count),
    interestType: isAdvance ? ("None" as const) : interestType,
    interestRate: rate === "" ? null : Number(rate),
    firstDeductionPeriodId: firstPeriod,
    reason,
    guarantorEmployeeId: guarantor || null,
  };
  const schedule = useMemo(
    () => buildSchedule(draft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loanType, principal, count, interestType, rate, firstPeriod]
  );
  const ready = (principal ?? 0) > 0 && (isAdvance || Number(count) >= 1);

  // The monthly-cap warning needs the employee's pay → ask the API (debounced), the schedule itself is local.
  useEffect(() => {
    if (!employeeId || !ready) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch<{ cap: Cap }>("/api/payroll/loans/preview", { method: "POST", body: draft })
        .then((r) => !cancelled && setCap(r.cap))
        .catch(() => undefined);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, loanType, principal, count, interestType, rate, firstPeriod, ready]);

  const err = (key: string) => (errors[key] ? `${t(errors[key].message)} (${errors[key].rule})` : undefined);

  async function save(submit: boolean) {
    setMessage(null);
    const local = validateLoanDraft(draft);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setSaving(true);
    let savedId = loan?.id;
    try {
      const body = { ...draft, comments };
      const saved = await apiFetch<EmployeeLoan>(loan ? `/api/payroll/loans/${loan.id}` : "/api/payroll/loans", {
        method: loan ? "PATCH" : "POST",
        body,
      });
      savedId = saved.id;
      if (submit) await apiFetch(`/api/payroll/loans/${saved.id}/transition`, { method: "POST", body: { action: "submit" } });
      router.push(`/payroll/loans/${saved.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      const detail = error instanceof ApiError ? Object.values(error.fieldErrors ?? {})[0]?.message : undefined;
      setMessage({
        text: `${savedId && submit ? t({ ar: "حُفظت المسودة لكن تعذّر الإرسال: ", en: "Draft saved but could not submit: " }) : ""}${detail ? t(detail) : (error as Error).message}`,
        draftId: savedId && submit ? savedId : undefined,
      });
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <DetailSection title={t(loan ? loanFormLabels.editTitle : loanFormLabels.newTitle)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t(loanFormLabels.employee)} required error={err("employeeId")} hint={role === "employee" ? t(loanFormLabels.selfOnly) : role === "deptHead" ? t(loanFormLabels.deptOnly) : undefined}>
              <EmployeeSelect
                value={employeeId}
                onValueChange={setEmployeeId}
                employees={scopedEmployees}
                disabled={Boolean(loan) || role === "employee"}
              />
            </FormField>
            <FormField label={t(loanFormLabels.type)} required error={err("loanType")}>
              <OptionSelect
                value={loanType}
                onChange={(v) => setLoanType(v as LoanType)}
                invalid={!!errors.loanType}
                options={Object.entries(loanTypeLabels).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </FormField>
            <FormField label={t(loanFormLabels.principal)} required error={err("principal")}>
              <MoneyInput value={principal} onChange={setPrincipal} invalid={!!errors.principal} />
            </FormField>
            {isAdvance ? (
              <p className="self-end pb-2 text-xs text-muted-foreground">{t(loanFormLabels.advanceNote)}</p>
            ) : (
              <FormField label={t(loanFormLabels.count)} required error={err("installmentCount")}>
                <Input type="number" min={1} max={60} dir="ltr" value={count} onChange={(e) => setCount(e.target.value)} aria-invalid={!!errors.installmentCount} />
              </FormField>
            )}
            {!isAdvance && (
              <>
                <FormField label={t(loanFormLabels.interest)}>
                  <OptionSelect
                    value={interestType}
                    onChange={(v) => setInterestType(v as "None" | "Flat")}
                    options={[
                      { value: "None", label: t(loanFormLabels.noInterest) },
                      { value: "Flat", label: t(loanFormLabels.flat) },
                    ]}
                  />
                </FormField>
                {interestType === "Flat" && (
                  <FormField label={t(loanFormLabels.rate)} required error={err("interestRate")}>
                    <Input type="number" step="any" dir="ltr" value={rate} onChange={(e) => setRate(e.target.value)} aria-invalid={!!errors.interestRate} />
                  </FormField>
                )}
              </>
            )}
            <FormField label={t(loanFormLabels.firstPeriod)} required error={err("firstDeductionPeriodId")}>
              <OptionSelect
                value={firstPeriod}
                onChange={setFirstPeriod}
                invalid={!!errors.firstDeductionPeriodId}
                options={PERIODS.map((p) => ({ value: p, label: formatPeriod(p) }))}
              />
            </FormField>
            <FormField label={t(loanFormLabels.guarantor)} error={err("guarantorEmployeeId")}>
              <EmployeeSelect value={guarantor} onValueChange={setGuarantor} employees={employees.data ?? []} />
            </FormField>
            <FormField label={t(loanFormLabels.reason)} required error={err("reason")} className="sm:col-span-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} />
            </FormField>
            <FormField label={t(loanFormLabels.comments)} className="sm:col-span-2">
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
            </FormField>
          </div>
        </DetailSection>

        <DetailSection title={t(loanFormLabels.attachments)}>
          <AttachmentUploader items={attachments} onChange={setAttachments} />
        </DetailSection>

        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message.text}{" "}
            {message.draftId && (
              <Link href={`/payroll/loans/${message.draftId}`} className="underline">
                {t({ ar: "فتح المسودة", en: "Open the draft" })}
              </Link>
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => save(false)}>
            {saving ? t({ ar: "جارٍ الحفظ...", en: "Saving..." }) : t(loanFormLabels.saveDraft)}
          </Button>
          <Button type="button" disabled={saving} onClick={() => save(true)}>{t(loanFormLabels.saveSubmit)}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t(commonLabels.cancel)}</Button>
        </div>
      </div>

      <div className="space-y-5 xl:sticky xl:top-4 xl:h-fit">
        {cap?.exceeds && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-secondary-orange/40 bg-secondary-orange/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-secondary-orange" />
            <div>
              <p className="font-medium">{t(loanDetailLabels.capWarningTitle)}</p>
              <p className="text-xs text-muted-foreground">
                {t(loanDetailLabels.capLimit)} ({cap.capPercent}%): <MoneyCell value={cap.cap} /> · {t(loanDetailLabels.capTotal)}: <MoneyCell value={cap.total} />
              </p>
            </div>
          </div>
        )}
        <DetailSection title={t(loanFormLabels.schedule)}>
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t(loanFormLabels.fillIn)}</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(loanFormLabels.total)}</span>
                <MoneyCell value={schedule.totalRepayable} bold />
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {schedule.rows.map((row) => (
                      <tr key={row.seqNo} className="border-t border-border">
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{row.seqNo}</td>
                        <td className="px-2 py-1.5"><bdi dir="ltr">{formatPeriod(row.duePeriodId)}</bdi></td>
                        <td className="px-2 py-1.5 text-end"><MoneyCell value={row.amount} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DetailSection>
      </div>
    </div>
  );
}
