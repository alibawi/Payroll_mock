"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  configCommon,
  effectiveStatusLabels,
  effectiveStatusTones,
  structureLabels,
} from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { effectiveStatus } from "@/lib/payroll/config-validation";
import { formatDate } from "@/lib/payroll/format";
import type { PayrollProfile, SalaryStructure } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Row = SalaryStructure & { search: string };

export default function PayStructuresPage() {
  const { t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const structures = useApi<SalaryStructure[]>("/api/payroll/config/structures");
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");
  const [profileFilter, setProfileFilter] = useState(FILTER_ALL);

  const rows: Row[] = useMemo(
    () =>
      (structures.data ?? [])
        .filter((s) => profileFilter === FILTER_ALL || s.profileId === profileFilter)
        .map((s) => ({ ...s, search: `${s.code} ${s.name.ar} ${s.name.en}` })),
    [structures.data, profileFilter]
  );
  const profileName = (id: string) => {
    const p = profiles.data?.find((x) => x.id === id);
    return p ? t(p.name) : id;
  };

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
    { key: "profile", header: t(configCommon.profile), cell: (r) => profileName(r.profileId) },
    {
      key: "lines",
      header: t(structureLabels.linesCount),
      sortValue: (r) => r.lines.length,
      cell: (r) => <span className="tabular-nums">{r.lines.length}</span>,
    },
    {
      key: "from",
      header: t(configCommon.effectiveFrom),
      sortValue: (r) => r.effectiveFrom,
      cell: (r) => <bdi dir="ltr">{formatDate(r.effectiveFrom)}</bdi>,
    },
    {
      key: "to",
      header: t(configCommon.effectiveTo),
      cell: (r) => (r.effectiveTo ? <bdi dir="ltr">{formatDate(r.effectiveTo)}</bdi> : t(configCommon.openEnded)),
    },
    {
      key: "status",
      header: t(configCommon.status),
      cell: (r) => {
        if (!r.isActive) return <StatusBadge label={t(configCommon.inactive)} />;
        const status = effectiveStatus(r);
        return <StatusBadge label={t(effectiveStatusLabels[status])} tone={effectiveStatusTones[status]} />;
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.structures}
        description={payrollScreenDescriptions.structures}
        actions={
          can("payroll.structure", "create") && (
            <Link href="/payroll/config/structures/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-4" />
              {t(structureLabels.newStructure)}
            </Link>
          )
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        loading={structures.loading}
        error={structures.error ? t(commonLabels.loadError) : undefined}
        onRetry={structures.reload}
        onRowClick={(r) => router.push(`/payroll/config/structures/${r.id}`)}
        rowClassName={(r) => (r.isActive ? undefined : "opacity-60")}
        filters={
          <FilterSelect
            label={t(configCommon.profile)}
            value={profileFilter}
            onChange={setProfileFilter}
            allLabel={t(configCommon.all)}
            options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))}
          />
        }
      />
    </div>
  );
}
