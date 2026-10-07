"use client";

import { CheckCircle2, FileSpreadsheet, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { OptionSelect } from "@/components/payroll/option-select";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { importLabels } from "@/lib/i18n/payroll-compensation-labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import type { LocalizedText } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Sample = {
  fileName: string;
  columns: { header: string; suggested: string; sample: string }[];
  rows: { row: number; employeeCode: string; profile: string; grade: number | null; step: number | null; baseSalary: number | null; effectiveFrom: string; paymentMethod: string; valid: boolean; error?: LocalizedText }[];
};
type Outcome = { fileName: string; total: number; imported: number[]; failed: { row: number; error?: LocalizedText }[] };

const FIELDS = Object.keys(importLabels.fields) as (keyof typeof importLabels.fields)[];
const IGNORE = "ignore";

/** Three-step mock Excel import: upload → map columns → result. Nothing is processed or written. */
export default function CompensationImportPage() {
  const { t } = useLocale();
  const can = useCan();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const sample = useApi<Sample>(step >= 2 ? "/api/payroll/compensations/import" : null);

  if (!can("payroll.compensation", "create")) return <EmptyState title={configCommon.readOnly} />;

  function pickFile(name: string) {
    setUploading(true);
    setFileName(name);
    // The file is never read — a short delay stands in for the upload.
    setTimeout(() => {
      setUploading(false);
      setStep(2);
    }, 800);
  }

  function initMapping(s: Sample) {
    setMapping((m) => (Object.keys(m).length ? m : Object.fromEntries(s.columns.map((c) => [c.header, c.suggested]))));
  }
  if (sample.data && Object.keys(mapping).length === 0) initMapping(sample.data);

  async function runImport() {
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(90, p + 15)), 250);
    try {
      const result = await apiFetch<Outcome>("/api/payroll/compensations/import", { method: "POST", body: { mapping } });
      setProgress(100);
      setOutcome(result);
      setStep(3);
    } finally {
      clearInterval(timer);
      setRunning(false);
    }
  }

  function restart() {
    setStep(1);
    setFileName("");
    setMapping({});
    setOutcome(null);
    setProgress(0);
  }

  const steps = [importLabels.step1, importLabels.step2, importLabels.step3];

  return (
    <div className="space-y-5">
      <PageHeader title={importLabels.title} description={importLabels.mockNotice} />

      <ol className="flex flex-wrap items-center gap-3 text-sm">
        {steps.map((label, i) => (
          <li key={label.en} className="flex items-center gap-2">
            <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-semibold", step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-secondary-green/20 text-secondary-green" : "bg-muted text-muted-foreground")}>
              {i + 1}
            </span>
            <span className={step === i + 1 ? "font-medium" : "text-muted-foreground"}>{t(label)}</span>
            {i < 2 && <span className="mx-1 text-muted-foreground">›</span>}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <DetailSection title={t(importLabels.step1)}>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0].name)} />
            {uploading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {fileName}
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>{t(importLabels.pick)}</Button>
                <Button type="button" onClick={() => pickFile("salaries-october-2026.xlsx")}>{t(importLabels.useSample)}</Button>
              </div>
            )}
          </div>
        </DetailSection>
      )}

      {step === 2 && (
        <>
          <DetailSection title={`${t(importLabels.step2)} — ${fileName}`}>
            {sample.loading || !sample.data ? (
              <p className="text-sm text-muted-foreground">…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-2 py-1.5 text-start font-medium">{t(importLabels.sourceColumn)}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t(importLabels.sampleValue)}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t(importLabels.targetField)}</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.data.columns.map((c) => (
                    <tr key={c.header} className="border-t border-border">
                      <td className="px-2 py-2 font-medium"><bdi dir="ltr">{c.header}</bdi></td>
                      <td className="px-2 py-2 text-muted-foreground"><bdi dir="ltr">{c.sample || "—"}</bdi></td>
                      <td className="px-2 py-2">
                        <div className="w-56">
                          <OptionSelect
                            value={mapping[c.header] ?? IGNORE}
                            onChange={(v) => setMapping((m) => ({ ...m, [c.header]: v }))}
                            options={[{ value: IGNORE, label: t(importLabels.ignored) }, ...FIELDS.map((f) => ({ value: f, label: t(importLabels.fields[f]) }))]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DetailSection>

          {sample.data && (
            <DetailSection title={`${t(importLabels.rows)} (${sample.data.rows.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <tbody>
                    {sample.data.rows.map((r) => (
                      <tr key={r.row} className="border-t border-border">
                        <td className="px-2 py-1.5 text-muted-foreground"><bdi dir="ltr">#{r.row}</bdi></td>
                        <td className="px-2 py-1.5"><bdi dir="ltr" className="font-mono text-xs">{r.employeeCode}</bdi></td>
                        <td className="px-2 py-1.5"><bdi dir="ltr" className="text-xs">{r.profile}</bdi></td>
                        <td className="px-2 py-1.5"><bdi dir="ltr">{r.grade != null ? `${r.grade}/${r.step}` : r.baseSalary?.toLocaleString("en-US")}</bdi></td>
                        <td className="px-2 py-1.5"><bdi dir="ltr">{formatDate(r.effectiveFrom)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailSection>
          )}

          {running && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">{t(importLabels.importing)}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={running}>{t(importLabels.back)}</Button>
            <Button type="button" onClick={runImport} disabled={running || !sample.data}>{running ? t(importLabels.importing) : t(importLabels.import)}</Button>
          </div>
        </>
      )}

      {step === 3 && outcome && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <CheckCircle2 className="size-6 text-secondary-green" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{outcome.imported.length}</p>
                <p className="text-sm text-muted-foreground">{t(importLabels.success)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <XCircle className="size-6 text-destructive" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{outcome.failed.length}</p>
                <p className="text-sm text-muted-foreground">{t(importLabels.failed)}</p>
              </div>
            </div>
          </div>
          {outcome.failed.length > 0 && (
            <DetailSection title={t(importLabels.failed)}>
              <table className="w-full text-sm">
                <tbody>
                  {outcome.failed.map((f) => (
                    <tr key={f.row} className="border-t border-border">
                      <td className="w-24 px-2 py-2"><StatusBadge tone="destructive" label={`${t(importLabels.row)} ${f.row}`} /></td>
                      <td className="px-2 py-2">{f.error ? t(f.error) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}
          <div className="flex gap-2">
            <Link href="/payroll/compensations" className={cn(buttonVariants())}>{t(importLabels.done)}</Link>
            <Button type="button" variant="outline" onClick={restart}>{t(importLabels.restart)}</Button>
          </div>
        </>
      )}
    </div>
  );
}
