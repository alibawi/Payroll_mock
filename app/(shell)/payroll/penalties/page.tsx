"use client";

import { Banknote, ClipboardList, Gauge, Hourglass, Plus, ScrollText, TestTubeDiagonal, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
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
  penaltyListLabels,
  penaltyStatusLabels,
  penaltyStatusTones,
  penaltyTypeLabels,
} from "@/lib/i18n/payroll-penalty-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { canSeeAmounts } from "@/lib/payroll/permissions";
import { CURRENT_PERIOD, formatPeriod } from "@/lib/payroll/periods";
import type { PenaltyRow } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Row = PenaltyRow & { search: string };
type Summary = {
  pendingApproval: number;
  applyingCount: number;
  applyingRemaining: number;
  dueThisMonth: number;
  nearCap: { employeeId: string; ratio: number }[];
  topAttendanceDepartments: { department: string; departmentEn: string; absenceDays: number; lateEvents: number }[];
  attendancePeriod: string | null;
};

const TABS = [
  { key: "all", label: penaltyListLabels.tabAll, statuses: null },
  { key: "Draft", label: penaltyListLabels.tabDraft, statuses: ["Draft"] },
  { key: "Approved", label: penaltyListLabels.tabApproved, statuses: ["Approved"] },
  { key: "Applying", label: penaltyListLabels.tabApplying, statuses: ["Applying"] },
  { key: "Applied", label: penaltyListLabels.tabApplied, statuses: ["Applied"] },
  { key: "Cancelled", label: penaltyListLabels.tabCancelled, statuses: ["Cancelled"] },
] as const;

export default function PenaltiesPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const { role } = useRole();
  const penalties = useApi<PenaltyRow[]>("/api/payroll/penalties");
  const summary = useApi<Summary>("/api/payroll/penalties/summary");

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [type, setType] = useState(FILTER_ALL);
  const [employee, setEmployee] = useState(FILTER_ALL);
  const [department, setDepartment] = useState(FILTER_ALL);

  const scoped = role === "employee" ? penaltyListLabels.employeeScope : role === "deptHead" ? penaltyListLabels.deptScope : null;
  const showKpis = (canSeeAmounts(role) || role === "financeAccountant") && !scoped;
  const empName = (e: PenaltyRow["employee"]) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");
  const deptName = (e: PenaltyRow["employee"]) => (e ? (locale === "ar" ? e.department : e.departmentEn) : "");

  const rows: Row[] = useMemo(
    () => (penalties.data ?? []).map((p) => ({ ...p, search: `${p.penaltyNo} ${p.decisionRef} ${p.employee?.fullNameAr ?? ""} ${p.employee?.fullNameEn ?? ""}` })),
    [penalties.data]
  );
  const employees = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => seen.set(r.employeeId, empName(r.employee)));
    return [...seen].map(([value, label]) => ({ value, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, locale]);
  const departments = useMemo(() => [...new Set(rows.map((r) => deptName(r.employee)).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, locale]);

  const filtered = rows.filter((r) => {
    const statuses = TABS.find((x) => x.key === tab)?.statuses;
    return (
      (!statuses || (statuses as readonly string[]).includes(r.status)) &&
      (type === FILTER_ALL || r.penaltyType === type) &&
      (employee === FILTER_ALL || r.employeeId === employee) &&
      (department === FILTER_ALL || deptName(r.employee) === department)
    );
  });
  const counts = Object.fromEntries(TABS.map((x) => [x.key, x.statuses ? rows.filter((r) => (x.statuses as readonly string[]).includes(r.status)).length : rows.length]));

  const columns: DataTableColumn<Row>[] = [
    { key: "penaltyNo", header: t(penaltyListLabels.penaltyNo), sortValue: (r) => r.penaltyNo, cell: (r) => <bdi dir="ltr" className="font-mono text-xs font-medium">{r.penaltyNo}</bdi> },
    {
      key: "employee",
      header: t(penaltyListLabels.employee),
      sortValue: (r) => empName(r.employee),
      cell: (r) => (
        <div>
          <div className="font-medium">{empName(r.employee)}</div>
          <div className="text-xs text-muted-foreground">{deptName(r.employee)}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: t(penaltyListLabels.type),
      cell: (r) => (
        <span>
          {t(penaltyTypeLabels[r.penaltyType])}
          {r.value != null && r.penaltyType === "DaysOfPay" && <bdi dir="ltr" className="text-xs text-muted-foreground"> × {r.value}</bdi>}
          {r.value != null && r.penaltyType === "PercentOfSalary" && <bdi dir="ltr" className="text-xs text-muted-foreground"> {r.value}%</bdi>}
        </span>
      ),
    },
    { key: "amount", header: t(penaltyListLabels.amount), sortValue: (r) => r.computedAmount, cell: (r) => <Amount value={r.computedAmount} bold /> },
    { key: "months", header: t(penaltyListLabels.months), cell: (r) => <bdi dir="ltr">{r.installmentCount > 0 ? `${r.deductedCount}/${r.installmentCount}` : r.spreadOverMonths}</bdi> },
    { key: "remaining", header: t(penaltyListLabels.remaining), sortValue: (r) => r.remainingAmount, cell: (r) => <Amount value={r.remainingAmount} /> },
    {
      key: "decision",
      header: t(penaltyListLabels.decision),
      cell: (r) => <bdi dir="ltr" className="font-mono text-xs">{r.decisionRef}</bdi>,
    },
    { key: "status", header: t(penaltyListLabels.status), cell: (r) => <StatusBadge label={t(penaltyStatusLabels[r.status])} tone={penaltyStatusTones[r.status]} /> },
  ];

  const s = summary.data;
  const top = s?.topAttendanceDepartments[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.penalties}
        description={{
          ar: "العقوبات التأديبية المالية وسجلّها القانوني، وسياسة خصم الغياب والتأخير",
          en: "Financial disciplinary penalties and their statutory register, plus the absence and lateness deduction policy",
        }}
        actions={
          <>
            <Link href="/payroll/penalties/attendance-simulator" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <TestTubeDiagonal className="size-4" />
              {t(penaltyListLabels.simulator)}
            </Link>
            <Link href="/payroll/penalties/register" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <ScrollText className="size-4" />
              {t(penaltyListLabels.register)}
            </Link>
            {can("payroll.penalty", "create") && (
              <Link href="/payroll/penalties/new" className={cn(buttonVariants({ size: "sm" }))}>
                <Plus className="size-4" />
                {t(penaltyListLabels.newPenalty)}
              </Link>
            )}
          </>
        }
      />
      {scoped && <p className="text-sm text-muted-foreground">{t(scoped)}</p>}

      {showKpis && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KPICard title={t(penaltyListLabels.kpiPending)} value={s ? s.pendingApproval : "…"} icon={Hourglass} tone={s && s.pendingApproval > 0 ? "warning" : "neutral"} />
          <KPICard title={t(penaltyListLabels.kpiApplying)} value={s ? s.applyingCount : "…"} description={s ? `${t(penaltyListLabels.kpiRemaining)}: ${s.applyingRemaining.toLocaleString("en-US")}` : undefined} icon={ClipboardList} tone="info" />
          <KPICard title={t(penaltyListLabels.kpiDue)} value={s ? s.dueThisMonth.toLocaleString("en-US") : "…"} description={s ? formatPeriod(CURRENT_PERIOD) : undefined} icon={Banknote} />
          <KPICard title={t(penaltyListLabels.kpiNearCap)} value={s ? s.nearCap.length : "…"} icon={Gauge} tone={s && s.nearCap.length > 0 ? "warning" : "neutral"} />
          <KPICard
            title={t(penaltyListLabels.kpiTopDept)}
            value={top ? (locale === "ar" ? top.department : top.departmentEn) : "—"}
            description={top ? `${top.absenceDays} ${t(penaltyListLabels.absence)} · ${top.lateEvents} ${t(penaltyListLabels.late)} (${s?.attendancePeriod ? formatPeriod(s.attendancePeriod) : ""})` : undefined}
            icon={TriangleAlert}
          />
        </div>
      )}

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
        searchPlaceholder={t(penaltyListLabels.searchPlaceholder)}
        loading={penalties.loading}
        error={penalties.error ? t(commonLabels.loadError) : undefined}
        onRetry={penalties.reload}
        emptyMessage={t(penaltyListLabels.emptyTitle)}
        onRowClick={(r) => router.push(`/payroll/penalties/${r.id}`)}
        filters={
          <>
            <FilterSelect label={t(penaltyListLabels.type)} value={type} onChange={setType} allLabel={t(commonLabels.all)} options={Object.entries(penaltyTypeLabels).map(([value, label]) => ({ value, label: t(label) }))} />
            {!scoped && <FilterSelect label={t(penaltyListLabels.employee)} value={employee} onChange={setEmployee} allLabel={t(commonLabels.all)} options={employees} />}
            {!scoped && <FilterSelect label={t(penaltyListLabels.department)} value={department} onChange={setDepartment} allLabel={t(commonLabels.all)} options={departments.map((d) => ({ value: d, label: d }))} />}
          </>
        }
      />
    </div>
  );
}
