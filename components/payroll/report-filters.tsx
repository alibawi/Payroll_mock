"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { useLocale } from "@/components/locale-provider";
import { reportCommonLabels } from "@/lib/i18n/payroll-report-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PayrollProfile, RunRow } from "@/lib/payroll/types";

/**
 * Period (+ optional profile) filter state shared by the report screens. The period defaults to the latest one
 * with a posted or paid regular run; the profile list comes from the module configuration.
 */
export function useReportFilters(withProfile = true) {
  const runs = useApi<RunRow[]>("/api/payroll/runs");
  const profiles = useApi<PayrollProfile[]>(withProfile ? "/api/payroll/config/profiles" : null);
  const [chosen, setChosen] = useState("");
  const [profile, setProfile] = useState(FILTER_ALL);

  const periods = useMemo(() => [...new Set((runs.data ?? []).filter((r) => r.runType === "Regular" && r.status !== "Reversed" && r.status !== "Draft").map((r) => r.periodKey))].sort().reverse(), [runs.data]);
  const defaultKey = useMemo(() => {
    const posted = (runs.data ?? []).filter((r) => r.runType === "Regular" && (r.status === "Posted" || r.status === "Paid")).map((r) => r.periodKey).sort();
    return posted[posted.length - 1] ?? periods[0] ?? "";
  }, [runs.data, periods]);

  return {
    periods,
    profiles: profiles.data ?? [],
    periodKey: chosen || defaultKey,
    setPeriodKey: setChosen,
    profile,
    setProfile,
    ready: Boolean(chosen || defaultKey),
    query: (extra = "") => `periodKey=${chosen || defaultKey}${profile !== FILTER_ALL ? `&profileId=${profile}` : ""}${extra}`,
  };
}

export function PeriodFilter({ filters, showProfile = true }: { filters: ReturnType<typeof useReportFilters>; showProfile?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <FilterSelect
        label={t(reportCommonLabels.period)}
        value={filters.periodKey || FILTER_ALL}
        onChange={filters.setPeriodKey}
        allLabel={filters.periodKey ? formatPeriod(filters.periodKey) : "…"}
        options={filters.periods.map((k) => ({ value: k, label: formatPeriod(k) }))}
      />
      {showProfile && (
        <FilterSelect
          label={t(reportCommonLabels.profile)}
          value={filters.profile}
          onChange={filters.setProfile}
          allLabel={t(reportCommonLabels.allProfiles)}
          options={filters.profiles.map((p) => ({ value: p.id, label: t(p.name) }))}
        />
      )}
    </div>
  );
}

/** T-1: shown on any report whose runs are not posted yet. */
export function DraftBanner({ isDraft }: { isDraft: boolean }) {
  const { t } = useLocale();
  if (!isDraft) return null;
  return (
    <div role="alert" className="no-print flex items-start gap-2 rounded-xl border border-secondary-orange/40 bg-secondary-orange/10 p-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-secondary-orange" />
      <div>
        <p className="font-medium">{t(reportCommonLabels.draftBadge)}</p>
        <p className="text-muted-foreground">{t(reportCommonLabels.draftHint)}</p>
      </div>
    </div>
  );
}

/** Mock export: downloads a real CSV built from the rows on screen (UTF-8 with BOM so Excel reads Arabic). */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Print rules shared by the report screens: only `.report-print` prints; `.no-print` is hidden. */
export function PrintStyles({ target = "report-print" }: { target?: string }) {
  return (
    <style>{`@media print { body * { visibility: hidden; } #${target}, #${target} * { visibility: visible; } #${target} { position: absolute; inset: 0; padding: 12px; background: white; color: black; } .no-print { display: none !important; } }`}</style>
  );
}
