"use client";

import { Calculator, CircleCheck, Layers, Scale, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { KPICard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge, ComponentFlagBadges, ComponentTypeBadge } from "@/components/payroll/component-badges";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  calculationMethodLabels,
  componentCategoryLabels,
  componentScreenLabels,
  configCommon,
} from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { PayrollComponent } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Row = PayrollComponent & { search: string };

const TABS = [
  { value: "all", label: componentScreenLabels.tabAll, type: null },
  { value: "Earning", label: componentScreenLabels.tabEarnings, type: "Earning" },
  { value: "Deduction", label: componentScreenLabels.tabDeductions, type: "Deduction" },
  { value: "EmployerContribution", label: componentScreenLabels.tabContributions, type: "EmployerContribution" },
  { value: "Informational", label: componentScreenLabels.tabInformational, type: "Informational" },
] as const;

export default function PayComponentsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const { data, loading, error, reload } = useApi<PayrollComponent[]>("/api/payroll/config/components");

  const [tab, setTab] = useState<string>("all");
  const [category, setCategory] = useState(FILTER_ALL);
  const [method, setMethod] = useState(FILTER_ALL);
  const [active, setActive] = useState(FILTER_ALL);

  const rows: Row[] = useMemo(
    () => (data ?? []).map((c) => ({ ...c, search: `${c.code} ${c.name.ar} ${c.name.en}` })),
    [data]
  );

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((x) => [x.value, x.type ? rows.filter((r) => r.componentType === x.type).length : rows.length])
      ),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tab === "all" || r.componentType === tab) &&
          (category === FILTER_ALL || r.category === category) &&
          (method === FILTER_ALL || r.calculationMethod === method) &&
          (active === FILTER_ALL || r.isActive === (active === "true"))
      ),
    [rows, tab, category, method, active]
  );

  const columns: DataTableColumn<Row>[] = [
    {
      key: "code",
      header: t(configCommon.code),
      sortValue: (r) => r.code,
      cell: (r) => (
        <bdi dir="ltr" className="font-mono text-xs font-medium">
          {r.code}
        </bdi>
      ),
    },
    { key: "name", header: t(configCommon.name), sortValue: (r) => t(r.name), cell: (r) => t(r.name) },
    { key: "type", header: t(configCommon.type), cell: (r) => <ComponentTypeBadge type={r.componentType} /> },
    { key: "category", header: t(configCommon.category), cell: (r) => t(componentCategoryLabels[r.category]) },
    {
      key: "method",
      header: t(configCommon.method),
      cell: (r) =>
        r.calculationMethod === "PercentOfBase" && r.percentValue != null
          ? `${t(calculationMethodLabels.PercentOfBase)} (${r.percentValue}%)`
          : t(calculationMethodLabels[r.calculationMethod]),
    },
    { key: "flags", header: t(configCommon.flags), cell: (r) => <ComponentFlagBadges component={r} /> },
    { key: "active", header: t(configCommon.active), cell: (r) => <ActiveBadge active={r.isActive} /> },
  ];

  const activeCount = rows.filter((r) => r.isActive).length;
  const statutory = rows.filter((r) => r.category === "StatutoryPension" || r.category === "StatutorySocialSecurity" || r.category === "IncomeTax").length;
  const reducers = rows.filter((r) => r.reducesGross).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.components}
        description={payrollScreenDescriptions.components}
        actions={
          can("payroll.component", "create") && (
            <Link href="/payroll/config/components/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-4" />
              {t(componentScreenLabels.newComponent)}
            </Link>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t(componentScreenLabels.kpiTotal)} value={rows.length} icon={Layers} />
        <KPICard
          title={t(componentScreenLabels.kpiActive)}
          value={activeCount}
          icon={CircleCheck}
          tone="success"
          progress={rows.length ? (activeCount / rows.length) * 100 : 0}
        />
        <KPICard title={t(componentScreenLabels.kpiStatutory)} value={statutory} icon={Scale} tone="info" />
        <KPICard title={t(componentScreenLabels.kpiReducesGross)} value={reducers} icon={Calculator} tone="warning" />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="flex-wrap">
          {TABS.map((x) => (
            <TabsTrigger key={x.value} value={x.value}>
              {t(x.label)}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] tabular-nums">
                {tabCounts[x.value] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        searchPlaceholder={t(componentScreenLabels.searchPlaceholder)}
        loading={loading}
        error={error ? t(commonLabels.loadError) : undefined}
        onRetry={reload}
        emptyMessage={t(componentScreenLabels.emptyTitle)}
        onRowClick={(r) => router.push(`/payroll/config/components/${r.id}`)}
        rowClassName={(r) => (r.isActive ? undefined : "opacity-60")}
        filters={
          <>
            <FilterSelect
              label={t(configCommon.category)}
              value={category}
              onChange={setCategory}
              allLabel={t(configCommon.all)}
              options={Object.entries(componentCategoryLabels).map(([value, label]) => ({ value, label: t(label) }))}
            />
            <FilterSelect
              label={t(configCommon.method)}
              value={method}
              onChange={setMethod}
              allLabel={t(configCommon.all)}
              options={Object.entries(calculationMethodLabels).map(([value, label]) => ({ value, label: t(label) }))}
            />
            <FilterSelect
              label={t(configCommon.status)}
              value={active}
              onChange={setActive}
              allLabel={t(configCommon.all)}
              options={[
                { value: "true", label: t(configCommon.active) },
                { value: "false", label: t(configCommon.inactive) },
              ]}
            />
          </>
        }
      />
    </div>
  );
}
