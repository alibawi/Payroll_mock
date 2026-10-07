"use client";

import { CalendarClock, ChartNoAxesColumn, TriangleAlert, Upload, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { useRole } from "@/components/role-provider";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonLabels } from "@/lib/i18n/labels";
import {
  compListLabels,
  employeeStatusLabels,
  paymentMethodLabels,
} from "@/lib/i18n/payroll-compensation-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { canSeeAmounts, DEPT_HEAD_DEPARTMENT } from "@/lib/payroll/permissions";
import { parseGradeStepId, type CompensationRow, type LocalizedText, type PayrollProfile } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Row = CompensationRow & { id: string; search: string };

type Summary = {
  payableEmployees: number;
  withSalary: number;
  withoutSalary: { id: string; fullNameAr: string; fullNameEn: string }[];
  byProfile: { profileId: string; code: string; name: LocalizedText; count: number; averageGross: number }[];
  changesLast30Days: number;
  belowMinimumWage: { employeeId: string; baseSalary: number; fullNameAr: string; fullNameEn: string }[];
  minimumWage: number;
};

const TABS = ["all", "gov", "priv", "none"] as const;

export default function CompensationsPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const { role } = useRole();
  const rows = useApi<CompensationRow[]>("/api/payroll/compensations");
  const summary = useApi<Summary>("/api/payroll/compensations/summary");
  const profiles = useApi<PayrollProfile[]>("/api/payroll/config/profiles");

  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [profile, setProfile] = useState(FILTER_ALL);
  const [department, setDepartment] = useState(FILTER_ALL);
  const [payment, setPayment] = useState(FILTER_ALL);

  const deptScoped = role === "deptHead";
  const showAmounts = canSeeAmounts(role);
  const profileName = (id: string | undefined) => {
    const p = profiles.data?.find((x) => x.id === id);
    return p ? t(p.name) : "—";
  };
  const govId = profiles.data?.find((p) => p.code === "GOVERNMENT_IQ")?.id;

  const all: Row[] = useMemo(
    () =>
      (rows.data ?? [])
        .filter((r) => !deptScoped || r.employee.department === DEPT_HEAD_DEPARTMENT)
        .map((r) => ({
          ...r,
          id: r.employee.id,
          search: `${r.employee.fullNameAr} ${r.employee.fullNameEn} ${r.employee.employeeCode}`,
        })),
    [rows.data, deptScoped]
  );

  const departments = useMemo(
    () => [...new Set(all.map((r) => (locale === "ar" ? r.employee.department : r.employee.departmentEn)))].sort(),
    [all, locale]
  );

  const tabCounts = {
    all: all.length,
    gov: all.filter((r) => r.compensation?.profileId === govId).length,
    priv: all.filter((r) => r.compensation && r.compensation.profileId !== govId).length,
    none: all.filter((r) => r.missing).length,
  };

  const filtered = all.filter(
    (r) =>
      (tab === "all" ||
        (tab === "none" && r.missing) ||
        (tab === "gov" && r.compensation?.profileId === govId) ||
        (tab === "priv" && r.compensation && r.compensation.profileId !== govId)) &&
      (profile === FILTER_ALL || r.compensation?.profileId === profile) &&
      (department === FILTER_ALL || (locale === "ar" ? r.employee.department : r.employee.departmentEn) === department) &&
      (payment === FILTER_ALL || r.compensation?.paymentMethod === payment)
  );

  const columns: DataTableColumn<Row>[] = [
    {
      key: "employee",
      header: t(compListLabels.employee),
      sortValue: (r) => (locale === "ar" ? r.employee.fullNameAr : r.employee.fullNameEn),
      cell: (r) => (
        <div>
          <div className="font-medium">{locale === "ar" ? r.employee.fullNameAr : r.employee.fullNameEn}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <bdi dir="ltr">{r.employee.employeeCode}</bdi>
            {r.employee.status !== "active" && (
              <StatusBadge label={t(employeeStatusLabels[r.employee.status])} tone={r.employee.status === "on_leave" ? "info" : "neutral"} className="px-1.5 text-[10px]" />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: t(compListLabels.department),
      cell: (r) => (locale === "ar" ? r.employee.department : r.employee.departmentEn),
    },
    { key: "profile", header: t(compListLabels.profile), cell: (r) => profileName(r.compensation?.profileId) },
    {
      key: "basis",
      header: t(compListLabels.basis),
      cell: (r) => {
        const c = r.compensation;
        if (!c) return "—";
        const cell = parseGradeStepId(c.gradeStepId);
        if (cell) {
          return (
            <span>
              {t({ ar: "درجة", en: "Grade" })} <bdi dir="ltr" className="font-medium">{cell.grade} / {cell.step}</bdi>
            </span>
          );
        }
        return c.baseSalary != null ? <Amount value={c.baseSalary} /> : "—";
      },
    },
    {
      key: "gross",
      header: t(compListLabels.gross),
      sortValue: (r) => r.gross ?? 0,
      cell: (r) => (r.gross != null ? <Amount value={r.gross} bold /> : "—"),
    },
    {
      key: "payment",
      header: t(compListLabels.payment),
      cell: (r) => (r.compensation ? t(paymentMethodLabels[r.compensation.paymentMethod]) : "—"),
    },
    {
      key: "since",
      header: t(compListLabels.since),
      sortValue: (r) => r.compensation?.effectiveFrom ?? "",
      cell: (r) => (r.compensation ? <bdi dir="ltr">{formatDate(r.compensation.effectiveFrom)}</bdi> : "—"),
    },
    {
      key: "state",
      header: t(compListLabels.state),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.missing && <StatusBadge tone="destructive" label={t(compListLabels.noCompensation)} />}
          {r.compensation && !r.isCurrent && <StatusBadge label={t(compListLabels.ended)} />}
          {r.hasUpcoming && <StatusBadge tone="info" label={t(compListLabels.upcoming)} />}
          {r.belowMinimum && showAmounts && <StatusBadge tone="warning" label={t(compListLabels.belowMin)} />}
        </div>
      ),
    },
  ];

  if (role === "employee") {
    return (
      <div className="space-y-5">
        <PageHeader title={payrollNavLabels.compensations} />
        <EmptyState title={compListLabels.employeeRole} />
      </div>
    );
  }

  const s = summary.data;
  const sectorAvg = (code: string) => s?.byProfile.find((p) => p.code === code);

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.compensations}
        description={{
          ar: "ربط كل موظف بملف الرواتب وهيكله ودرجته أو أجره الأساسي، بسجل تاريخي مؤرّخ",
          en: "Link each employee to a payroll profile, structure and grade or base wage, with a dated history",
        }}
        actions={
          can("payroll.compensation", "create") && (
            <Link href="/payroll/compensations/import" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Upload className="size-4" />
              {t(compListLabels.import)}
            </Link>
          )
        }
      />

      {deptScoped && <p className="text-sm text-muted-foreground">{t(compListLabels.deptScope)} — {DEPT_HEAD_DEPARTMENT}</p>}
      {!showAmounts && <p className="text-sm text-muted-foreground">{t(compListLabels.maskedNotice)}</p>}

      {showAmounts && s && (s.withoutSalary.length > 0 || s.belowMinimumWage.length > 0) && (
        <div role="alert" className="space-y-1 rounded-xl border border-secondary-orange/40 bg-secondary-orange/10 p-4 text-sm">
          {s.withoutSalary.length > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <TriangleAlert className="size-4 text-secondary-orange" />
              <span className="font-medium">{t(compListLabels.alertMissing)}:</span>
              {s.withoutSalary.map((e) => (
                <Link key={e.id} href={`/payroll/compensations/${e.id}`} className="underline-offset-2 hover:underline">
                  {locale === "ar" ? e.fullNameAr : e.fullNameEn}
                </Link>
              ))}
            </p>
          )}
          {s.belowMinimumWage.length > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <TriangleAlert className="size-4 text-secondary-orange" />
              <span className="font-medium">
                {t(compListLabels.alertBelow)} (<bdi dir="ltr">{s.minimumWage.toLocaleString("en-US")}</bdi>):
              </span>
              {s.belowMinimumWage.map((e) => (
                <Link key={e.employeeId} href={`/payroll/compensations/${e.employeeId}`} className="underline-offset-2 hover:underline">
                  {locale === "ar" ? e.fullNameAr : e.fullNameEn}
                </Link>
              ))}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard
          title={t(compListLabels.kpiWithSalary)}
          value={s ? `${s.withSalary} / ${s.payableEmployees}` : "…"}
          icon={UserCheck}
          tone="success"
          progress={s && s.payableEmployees ? (s.withSalary / s.payableEmployees) * 100 : 0}
        />
        <KPICard title={t(compListLabels.kpiMissing)} value={s ? s.withoutSalary.length : "…"} icon={UserX} tone={s && s.withoutSalary.length > 0 ? "destructive" : "neutral"} />
        <KPICard
          title={t(compListLabels.kpiBelowMin)}
          value={s ? s.belowMinimumWage.length : "…"}
          icon={TriangleAlert}
          tone={s && s.belowMinimumWage.length > 0 ? "warning" : "neutral"}
        />
        <KPICard title={t(compListLabels.kpiChanges)} value={s ? s.changesLast30Days : "…"} icon={CalendarClock} />
        <KPICard
          title={t(compListLabels.kpiAvg)}
          value={showAmounts && s ? `${(sectorAvg("GOVERNMENT_IQ")?.averageGross ?? 0).toLocaleString("en-US")}` : "••••••"}
          description={
            showAmounts && s
              ? `${t(compListLabels.tabGov)} · ${t(compListLabels.tabPriv)}: ${(sectorAvg("PRIVATE_IQ")?.averageGross ?? 0).toLocaleString("en-US")}`
              : undefined
          }
          icon={ChartNoAxesColumn}
          tone="info"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number])}>
        <TabsList className="flex-wrap">
          {TABS.map((x) => (
            <TabsTrigger key={x} value={x}>
              {t(x === "all" ? compListLabels.tabAll : x === "gov" ? compListLabels.tabGov : x === "priv" ? compListLabels.tabPriv : compListLabels.tabNone)}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] tabular-nums">{tabCounts[x]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchKeys={["search"]}
        searchPlaceholder={t(compListLabels.searchPlaceholder)}
        loading={rows.loading}
        error={rows.error ? t(commonLabels.loadError) : undefined}
        onRetry={rows.reload}
        pageSize={12}
        onRowClick={(r) => router.push(`/payroll/compensations/${r.employee.id}`)}
        rowClassName={(r) => (r.isCurrent || r.missing ? undefined : "opacity-60")}
        filters={
          <>
            <FilterSelect
              label={t(compListLabels.profile)}
              value={profile}
              onChange={setProfile}
              allLabel={t(commonLabels.all)}
              options={(profiles.data ?? []).map((p) => ({ value: p.id, label: t(p.name) }))}
            />
            <FilterSelect
              label={t(compListLabels.department)}
              value={department}
              onChange={setDepartment}
              allLabel={t(commonLabels.all)}
              options={departments.map((d) => ({ value: d, label: d }))}
            />
            <FilterSelect
              label={t(compListLabels.payment)}
              value={payment}
              onChange={setPayment}
              allLabel={t(commonLabels.all)}
              options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label: t(label) }))}
            />
          </>
        }
      />
    </div>
  );
}
