"use client";

import { Ban, CircleCheck, Hourglass, Plus, Undo2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmployeeSelect } from "@/components/employee-select";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { FormField } from "@/components/form-field";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { MoneyInput } from "@/components/payroll/money-input";
import { OptionSelect } from "@/components/payroll/option-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { inputListLabels, inputStatusLabels, inputStatusTones } from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { FieldErrors, LocalizedText, PayrollInput, PeriodRow } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";

type ComponentOption = { id: string; code: string; name: LocalizedText; componentType: "Earning" | "Deduction" };
type InputRow = PayrollInput & { employee: Employee | null; component: ComponentOption | null };
type Payload = { rows: InputRow[]; componentOptions: ComponentOption[] };
type Row = InputRow & { search: string };

const TABS = [
  { key: "all", label: inputListLabels.tabAll, status: null },
  { key: "pending", label: inputListLabels.tabPending, status: "Pending" },
  { key: "applied", label: inputListLabels.tabApplied, status: "Applied" },
  { key: "cancelled", label: inputListLabels.tabCancelled, status: "Cancelled" },
] as const;

export default function InputsPage() {
  const { locale, t } = useLocale();
  const can = useCan();
  const inputs = useApi<Payload>(can("payroll.input", "view") ? "/api/payroll/inputs" : null);
  const periods = useApi<PeriodRow[]>(can("payroll.input", "view") ? "/api/payroll/periods" : null);

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [period, setPeriod] = useState(FILTER_ALL);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<InputRow | null>(null);

  const empName = (e: Employee | null) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");
  const rows: Row[] = useMemo(
    () => (inputs.data?.rows ?? []).map((r) => ({ ...r, search: `${r.employee?.fullNameAr ?? ""} ${r.employee?.fullNameEn ?? ""} ${r.reason}` })),
    [inputs.data]
  );
  const periodKeys = [...new Set(rows.map((r) => r.periodKey))].sort().reverse();
  const filtered = rows.filter((r) => {
    const status = TABS.find((x) => x.key === tab)?.status;
    return (!status || r.status === status) && (period === FILTER_ALL || r.periodKey === period);
  });
  const counts = Object.fromEntries(TABS.map((x) => [x.key, x.status ? rows.filter((r) => r.status === x.status).length : rows.length]));

  const pending = rows.filter((r) => r.status === "Pending");
  const signed = (r: InputRow) => (r.component?.componentType === "Deduction" ? -r.amount : r.amount);
  const openPeriods = [...new Set((periods.data ?? []).filter((p) => p.status === "Open").map((p) => p.periodKey))].sort();

  if (!can("payroll.input", "view")) return <EmptyState title={configCommon.readOnly} />;

  const columns: DataTableColumn<Row>[] = [
    {
      key: "employee",
      header: t(inputListLabels.employee),
      sortValue: (r) => empName(r.employee),
      cell: (r) => (
        <div>
          <div className="font-medium">{empName(r.employee)}</div>
          <div className="text-xs text-muted-foreground"><bdi dir="ltr">{r.employee?.employeeCode}</bdi></div>
        </div>
      ),
    },
    {
      key: "component",
      header: t(inputListLabels.component),
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {r.component ? t(r.component.name) : "—"}
          {r.component && <StatusBadge tone={r.component.componentType === "Earning" ? "success" : "warning"} label={t(r.component.componentType === "Earning" ? inputListLabels.earning : inputListLabels.deduction)} className="text-[10px]" />}
          {r.isRetroAdjustment && <StatusBadge tone="info" label={t(inputListLabels.retro)} className="text-[10px]" />}
        </div>
      ),
    },
    { key: "period", header: t(inputListLabels.period), sortValue: (r) => r.periodKey, cell: (r) => <bdi dir="ltr">{formatPeriod(r.periodKey)}</bdi> },
    { key: "amount", header: t(inputListLabels.amount), sortValue: (r) => signed(r), cell: (r) => <Amount value={signed(r)} signed bold /> },
    { key: "reason", header: t(inputListLabels.reason), cell: (r) => <span className="line-clamp-2 max-w-[240px] text-sm text-muted-foreground">{r.reason}</span> },
    {
      key: "run",
      header: t(inputListLabels.run),
      cell: (r) =>
        r.appliedRunId ? (
          <Link href={`/payroll/runs/${r.appliedRunId}`} className="font-mono text-xs text-primary hover:underline">
            <bdi dir="ltr">{r.appliedRunId.replace("run-", "")}</bdi>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "status", header: t(inputListLabels.status), cell: (r) => <StatusBadge label={t(inputStatusLabels[r.status])} tone={inputStatusTones[r.status]} /> },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "Pending" && can("payroll.input", "update") ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setCancelling(r)}>
            <Ban className="size-4" />
            {t(inputListLabels.cancelInput)}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.inputs}
        description={{
          ar: "مكافآت وتسويات واستقطاعات لمرة واحدة تلتقطها دورة الرواتب عند الاحتساب",
          en: "One-off bonuses, adjustments and deductions that the payroll run picks up when it calculates",
        }}
        actions={
          can("payroll.input", "create") && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t(inputListLabels.newInput)}
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(inputListLabels.kpiPending)} value={inputs.data ? pending.length : "…"} icon={Hourglass} tone={pending.length > 0 ? "warning" : "neutral"} />
        <KPICard title={t(inputListLabels.kpiPendingAmount)} value={inputs.data ? pending.reduce((s, r) => s + signed(r), 0).toLocaleString("en-US") : "…"} icon={Hourglass} />
        <KPICard title={t(inputListLabels.kpiApplied)} value={inputs.data ? rows.filter((r) => r.status === "Applied").length : "…"} icon={CircleCheck} tone="success" />
        <KPICard title={t(inputListLabels.kpiRetro)} value={inputs.data ? rows.filter((r) => r.isRetroAdjustment && r.status !== "Cancelled").length : "…"} icon={Undo2} tone="info" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex-wrap">
          {TABS.map((x) => (
            <TabsTrigger key={x.key} value={x.key}>
              {t(x.label)}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] tabular-nums">{counts[x.key] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        searchPlaceholder={t(inputListLabels.searchPlaceholder)}
        loading={inputs.loading}
        error={inputs.error ? t(commonLabels.loadError) : undefined}
        onRetry={inputs.reload}
        emptyMessage={t(inputListLabels.empty)}
        filters={
          <FilterSelect label={t(inputListLabels.period)} value={period} onChange={setPeriod} allLabel={t(commonLabels.all)} options={periodKeys.map((k) => ({ value: k, label: formatPeriod(k) }))} />
        }
      />

      {creating && (
        <NewInputDialog
          periodKeys={openPeriods}
          components={inputs.data?.componentOptions ?? []}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            inputs.reload();
            periods.reload();
          }}
        />
      )}
      {cancelling && (
        <CancelDialog
          input={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            inputs.reload();
          }}
        />
      )}
    </div>
  );
}

function NewInputDialog({ periodKeys, components, onClose, onDone }: { periodKeys: string[]; components: ComponentOption[]; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [periodKey, setPeriodKey] = useState(periodKeys[periodKeys.length - 1] ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [componentId, setComponentId] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [retro, setRetro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const message = (key: string) => (errors[key] ? t(errors[key].message) : undefined);

  async function submit() {
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      await apiFetch("/api/payroll/inputs", { method: "POST", body: { periodKey, employeeId, componentId, amount: amount ?? 0, reason, isRetroAdjustment: retro } });
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
      className="sm:max-w-lg"
      title={t(inputListLabels.newInput)}
      description={t(inputListLabels.newInputDescription)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" onClick={submit} disabled={busy}>{t(inputListLabels.create)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t(inputListLabels.period)} required error={message("periodKey")}>
          <OptionSelect value={periodKey} onChange={setPeriodKey} invalid={!!errors.periodKey} options={periodKeys.map((k) => ({ value: k, label: formatPeriod(k) }))} />
        </FormField>
        <FormField label={t(inputListLabels.employee)} required error={message("employeeId")}>
          <EmployeeSelect value={employeeId} onValueChange={setEmployeeId} />
        </FormField>
        <FormField label={t(inputListLabels.component)} required error={message("componentId")}>
          <OptionSelect
            value={componentId}
            onChange={setComponentId}
            invalid={!!errors.componentId}
            placeholder={t(inputListLabels.selectComponent)}
            options={components.map((c) => ({ value: c.id, label: `${t(c.name)} — ${t(c.componentType === "Earning" ? inputListLabels.earning : inputListLabels.deduction)}` }))}
          />
        </FormField>
        <FormField label={t(inputListLabels.amount)} required error={message("amount")}>
          <MoneyInput value={amount} onChange={setAmount} invalid={!!errors.amount} />
        </FormField>
        <FormField label={t(inputListLabels.reason)} required error={message("reason")}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason || undefined} />
        </FormField>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={retro} onCheckedChange={(c) => setRetro(c === true)} className="mt-0.5" />
          <span>
            {t(inputListLabels.retro)}
            <span className="block text-xs text-muted-foreground">{t(inputListLabels.retroHint)}</span>
          </span>
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

function CancelDialog({ input, onClose, onDone }: { input: InputRow; onClose: () => void; onDone: () => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/payroll/inputs/${input.id}`, { method: "POST", body: { action: "cancel" } });
      onDone();
    } catch (e) {
      const message = e instanceof ApiError ? Object.values(e.fieldErrors ?? {})[0]?.message : undefined;
      setError(message ? t(message) : (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={t(inputListLabels.cancelInput)}
      description={t(inputListLabels.cancelBody)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t(commonLabels.cancel)}</Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={busy}>{t(inputListLabels.cancelInput)}</Button>
        </>
      }
    >
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
