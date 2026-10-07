"use client";

import { CalendarCheck, CalendarClock, Hourglass, LockKeyhole, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { FormField } from "@/components/form-field";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { OptionSelect } from "@/components/payroll/option-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import {
  periodListLabels,
  periodStatusLabels,
  periodStatusTones,
  runStatusLabels,
  runStatusTones,
} from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { formatPeriod } from "@/lib/payroll/periods";
import type { FieldErrors, PayrollProfile, PeriodRow } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

type Row = PeriodRow & { search: string };

export default function PeriodsPage() {
  const { t } = useLocale();
  const can = useCan();
  const periods = useApi<PeriodRow[]>(can("payroll.period", "view") ? "/api/payroll/periods" : null);
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");

  const [year, setYear] = useState(FILTER_ALL);
  const [profile, setProfile] = useState(FILTER_ALL);
  const [status, setStatus] = useState(FILTER_ALL);
  const [creating, setCreating] = useState(false);

  const profileName = (id: string) => {
    const p = profiles.data?.find((x) => x.id === id);
    return p ? t(p.name) : id;
  };

  const rows: Row[] = useMemo(
    () => (periods.data ?? []).map((p) => ({ ...p, search: `${p.periodKey} ${formatPeriod(p.periodKey)}` })),
    [periods.data]
  );
  const years = [...new Set(rows.map((r) => String(r.year)))].sort().reverse();
  const filtered = rows.filter(
    (r) => (year === FILTER_ALL || String(r.year) === year) && (profile === FILTER_ALL || r.profileId === profile) && (status === FILTER_ALL || r.status === status)
  );

  const count = (s: PeriodRow["status"]) => rows.filter((r) => r.status === s).length;
  const pendingInputs = rows.filter((r) => r.status === "Open").reduce((sum, r) => sum + r.pendingInputs, 0);

  if (!can("payroll.period", "view")) return <EmptyState title={configCommon.readOnly} />;

  const columns: DataTableColumn<Row>[] = [
    {
      key: "period",
      header: t(periodListLabels.period),
      sortValue: (r) => `${r.periodKey}${r.profileId}`,
      cell: (r) => <bdi dir="ltr" className="font-mono text-sm font-medium">{formatPeriod(r.periodKey)}</bdi>,
    },
    { key: "profile", header: t(periodListLabels.profile), cell: (r) => profileName(r.profileId) },
    {
      key: "range",
      header: t(periodListLabels.range),
      cell: (r) => (
        <bdi dir="ltr" className="text-xs text-muted-foreground">
          {formatDate(r.startDate)} → {formatDate(r.endDate)}
        </bdi>
      ),
    },
    { key: "cutoff", header: t(periodListLabels.cutoff), cell: (r) => <bdi dir="ltr" className="text-xs">{formatDate(r.cutoffDate)}</bdi> },
    { key: "payDate", header: t(periodListLabels.payDate), cell: (r) => <bdi dir="ltr" className="text-xs">{formatDate(r.payDate)}</bdi> },
    {
      key: "mainRun",
      header: t(periodListLabels.mainRun),
      cell: (r) =>
        r.mainRun ? (
          <div className="flex items-center gap-2">
            <Link href={`/payroll/runs/${r.mainRun.id}`} className="font-mono text-xs font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              <bdi dir="ltr">{r.mainRun.runNo}</bdi>
            </Link>
            <StatusBadge label={t(runStatusLabels[r.mainRun.status])} tone={runStatusTones[r.mainRun.status]} className="text-[10px]" />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{t(periodListLabels.noRun)}</span>
        ),
    },
    {
      key: "runs",
      header: t(periodListLabels.runs),
      sortValue: (r) => r.runCount,
      cell: (r) => <bdi dir="ltr" className="tabular-nums">{r.runCount}</bdi>,
    },
    {
      key: "pending",
      header: t(periodListLabels.pendingInputs),
      sortValue: (r) => r.pendingInputs,
      cell: (r) =>
        r.pendingInputs > 0 ? (
          <Link href="/payroll/inputs" className="font-medium text-secondary-orange hover:underline" onClick={(e) => e.stopPropagation()}>
            <bdi dir="ltr">{r.pendingInputs}</bdi>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: t(periodListLabels.status),
      cell: (r) => <StatusBadge label={t(periodStatusLabels[r.status])} tone={periodStatusTones[r.status]} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.periods}
        description={{
          ar: "فترات الرواتب الشهرية لكل ملف: مفتوحة ← مقفلة (باعتماد الدورة) ← مغلقة (بالدفع)",
          en: "Monthly payroll periods per profile: open → locked (run approved) → closed (paid)",
        }}
        actions={
          can("payroll.period", "create") && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t(periodListLabels.newPeriod)}
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(periodListLabels.kpiOpen)} value={periods.data ? count("Open") : "…"} icon={CalendarClock} tone="success" />
        <KPICard title={t(periodListLabels.kpiLocked)} value={periods.data ? count("Locked") : "…"} icon={LockKeyhole} tone={count("Locked") > 0 ? "warning" : "neutral"} />
        <KPICard title={t(periodListLabels.kpiClosed)} value={periods.data ? count("Closed") : "…"} icon={CalendarCheck} />
        <KPICard title={t(periodListLabels.kpiPending)} value={periods.data ? pendingInputs : "…"} icon={Hourglass} tone={pendingInputs > 0 ? "warning" : "neutral"} />
      </div>

      <p className="text-xs text-muted-foreground">
        {t(periodListLabels.lifecycle)} · {t(periodListLabels.weeklyDaily)}
      </p>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        searchPlaceholder={t(periodListLabels.searchPlaceholder)}
        loading={periods.loading}
        error={periods.error ? t(commonLabels.loadError) : undefined}
        onRetry={periods.reload}
        emptyMessage={t(periodListLabels.empty)}
        filters={
          <>
            <FilterSelect label={t(periodListLabels.year)} value={year} onChange={setYear} allLabel={t(commonLabels.all)} options={years.map((y) => ({ value: y, label: y }))} />
            <FilterSelect label={t(periodListLabels.profile)} value={profile} onChange={setProfile} allLabel={t(commonLabels.all)} options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))} />
            <FilterSelect label={t(periodListLabels.status)} value={status} onChange={setStatus} allLabel={t(commonLabels.all)} options={Object.entries(periodStatusLabels).map(([value, label]) => ({ value, label: t(label) }))} />
          </>
        }
      />

      {creating && (
        <NewPeriodDialog
          profiles={profiles.data ?? []}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            periods.reload();
          }}
        />
      )}
    </div>
  );
}

function NewPeriodDialog({ profiles, onClose, onDone }: { profiles: PayrollProfile[]; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("11");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${String(i + 1).padStart(2, "0")}` }));
  const message = (key: string) => (errors[key] ? t(errors[key].message) : undefined);

  async function submit() {
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      await apiFetch("/api/payroll/periods", { method: "POST", body: { profileId, year: Number(year), month: Number(month) } });
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={t(periodListLabels.newPeriod)}
      description={t(periodListLabels.newPeriodDescription)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" onClick={submit} disabled={busy || !profileId}>{t(periodListLabels.create)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t(periodListLabels.profile)} required error={message("profileId")}>
          <OptionSelect value={profileId} onChange={setProfileId} options={profiles.map((p) => ({ value: p.id, label: t(p.name) }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t(periodListLabels.year)} required error={message("year")}>
            <Input dir="ltr" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </FormField>
          <FormField label={t(periodListLabels.month)} required error={message("month")}>
            <OptionSelect value={month} onChange={setMonth} options={months} />
          </FormField>
        </div>
        <FormField label={t(periodListLabels.periodType)}>
          <Input value={t(periodListLabels.monthly)} disabled />
        </FormField>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
