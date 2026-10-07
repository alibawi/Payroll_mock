"use client";

import { Banknote, CalendarClock, ClipboardCheck, Hourglass, Landmark, Scale, Plus } from "lucide-react";
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
  loanListLabels,
  loanStatusLabels,
  loanStatusTones,
  loanTypeLabels,
} from "@/lib/i18n/payroll-loan-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { canSeeAmounts } from "@/lib/payroll/permissions";
import { CURRENT_PERIOD, formatPeriod } from "@/lib/payroll/periods";
import type { LoanRow } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Row = LoanRow & { search: string };
type Summary = {
  outstandingTotal: number;
  activeCount: number;
  pendingApproval: number;
  readyToDisburse: number;
  dueThisMonth: { count: number; amount: number };
  averageInstallment: number;
  overdueOrDeferred: number;
};

const TABS = [
  { key: "all", label: loanListLabels.tabAll, statuses: null },
  { key: "pending", label: loanListLabels.tabPending, statuses: ["PendingApproval"] },
  { key: "approved", label: loanListLabels.tabApproved, statuses: ["Approved"] },
  { key: "active", label: loanListLabels.tabActive, statuses: ["Disbursed", "Active"] },
  { key: "settled", label: loanListLabels.tabSettled, statuses: ["Settled"] },
  { key: "cancelled", label: loanListLabels.tabCancelled, statuses: ["Cancelled"] },
] as const;

export default function LoansPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const can = useCan();
  const { role } = useRole();
  const loans = useApi<LoanRow[]>("/api/payroll/loans");
  const summary = useApi<Summary>("/api/payroll/loans/summary");

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [type, setType] = useState(FILTER_ALL);
  const [employee, setEmployee] = useState(FILTER_ALL);
  const [period, setPeriod] = useState(FILTER_ALL);

  const showAmounts = canSeeAmounts(role) || role === "employee";
  const empName = (e: LoanRow["employee"]) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");

  const rows: Row[] = useMemo(
    () => (loans.data ?? []).map((l) => ({ ...l, search: `${l.loanNo} ${l.employee?.fullNameAr ?? ""} ${l.employee?.fullNameEn ?? ""}` })),
    [loans.data]
  );

  const employees = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => seen.set(r.employeeId, empName(r.employee)));
    return [...seen].map(([value, label]) => ({ value, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, locale]);

  const filtered = rows.filter((r) => {
    const statuses = TABS.find((x) => x.key === tab)?.statuses;
    return (
      (!statuses || (statuses as readonly string[]).includes(r.status)) &&
      (type === FILTER_ALL || r.loanType === type) &&
      (employee === FILTER_ALL || r.employeeId === employee) &&
      (period === FILTER_ALL || r.nextInstallment?.duePeriodId === period)
    );
  });
  const counts = Object.fromEntries(
    TABS.map((x) => [x.key, x.statuses ? rows.filter((r) => (x.statuses as readonly string[]).includes(r.status)).length : rows.length])
  );

  const columns: DataTableColumn<Row>[] = [
    {
      key: "loanNo",
      header: t(loanListLabels.loanNo),
      sortValue: (r) => r.loanNo,
      cell: (r) => <bdi dir="ltr" className="font-mono text-xs font-medium">{r.loanNo}</bdi>,
    },
    {
      key: "employee",
      header: t(loanListLabels.employee),
      sortValue: (r) => empName(r.employee),
      cell: (r) => (
        <div>
          <div className="font-medium">{empName(r.employee)}</div>
          <div className="text-xs text-muted-foreground"><bdi dir="ltr">{r.employee?.employeeCode}</bdi></div>
        </div>
      ),
    },
    { key: "type", header: t(loanListLabels.type), cell: (r) => t(loanTypeLabels[r.loanType]) },
    { key: "principal", header: t(loanListLabels.principal), sortValue: (r) => r.principal, cell: (r) => <Amount value={r.principal} /> },
    { key: "balance", header: t(loanListLabels.balance), sortValue: (r) => r.outstandingBalance, cell: (r) => <Amount value={r.outstandingBalance} bold /> },
    {
      key: "installment",
      header: t(loanListLabels.installment),
      cell: (r) => (
        <div>
          <Amount value={r.installmentAmount} />
          {r.loanType === "PersonalLoan" && <div className="text-xs text-muted-foreground"><bdi dir="ltr">× {r.installmentCount}</bdi></div>}
        </div>
      ),
    },
    {
      key: "next",
      header: t(loanListLabels.next),
      cell: (r) =>
        r.nextInstallment ? (
          <bdi dir="ltr" className={r.nextInstallment.duePeriodId === CURRENT_PERIOD ? "font-medium text-secondary-orange" : undefined}>
            #{r.nextInstallment.seqNo} · {formatPeriod(r.nextInstallment.duePeriodId)}
          </bdi>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: t(loanListLabels.status),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge label={t(loanStatusLabels[r.status])} tone={loanStatusTones[r.status]} />
          {r.hasDeferred && <StatusBadge label={t(loanListLabels.deferred)} className="text-[10px]" />}
        </div>
      ),
    },
  ];

  const s = summary.data;
  const scoped = role === "employee" ? loanListLabels.employeeScope : role === "deptHead" ? loanListLabels.deptScope : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.loans}
        description={{
          ar: "قروض الموظفين وسلف الرواتب: طلب ← اعتماد ← صرف ← أقساط تُستقطع من الراتب",
          en: "Employee loans and salary advances: request → approval → disbursement → instalments deducted from pay",
        }}
        actions={
          can("payroll.loan", "create") && (
            <Link href="/payroll/loans/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-4" />
              {t(loanListLabels.newRequest)}
            </Link>
          )
        }
      />
      {scoped && <p className="text-sm text-muted-foreground">{t(scoped)}</p>}

      {showAmounts && !scoped && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KPICard title={t(loanListLabels.kpiOutstanding)} value={s ? s.outstandingTotal.toLocaleString("en-US") : "…"} description={s ? `${s.activeCount} ${t(loanListLabels.loans)}` : undefined} icon={Landmark} tone="info" />
          <KPICard title={t(loanListLabels.kpiPending)} value={s ? s.pendingApproval : "…"} description={s ? `${s.readyToDisburse} ${t(loanListLabels.ready)}` : undefined} icon={Hourglass} tone={s && s.pendingApproval > 0 ? "warning" : "neutral"} />
          <KPICard title={t(loanListLabels.kpiDue)} value={s ? s.dueThisMonth.count : "…"} description={s ? `${s.dueThisMonth.amount.toLocaleString("en-US")} · ${formatPeriod(CURRENT_PERIOD)}` : undefined} icon={CalendarClock} />
          <KPICard title={t(loanListLabels.kpiAvg)} value={s ? s.averageInstallment.toLocaleString("en-US") : "…"} icon={Banknote} />
          <KPICard title={t(loanListLabels.kpiOverdue)} value={s ? s.overdueOrDeferred : "…"} icon={Scale} tone={s && s.overdueOrDeferred > 0 ? "warning" : "neutral"} />
          <KPICard title={t(loanListLabels.kpiActive)} value={s ? s.activeCount : "…"} icon={ClipboardCheck} tone="success" />
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
        searchPlaceholder={t(loanListLabels.searchPlaceholder)}
        loading={loans.loading}
        error={loans.error ? t(commonLabels.loadError) : undefined}
        onRetry={loans.reload}
        emptyMessage={t(loanListLabels.emptyTitle)}
        onRowClick={(r) => router.push(`/payroll/loans/${r.id}`)}
        filters={
          <>
            <FilterSelect label={t(loanListLabels.type)} value={type} onChange={setType} allLabel={t(commonLabels.all)} options={Object.entries(loanTypeLabels).map(([value, label]) => ({ value, label: t(label) }))} />
            {!scoped && <FilterSelect label={t(loanListLabels.employee)} value={employee} onChange={setEmployee} allLabel={t(commonLabels.all)} options={employees} />}
            <FilterSelect
              label={t(loanListLabels.period)}
              value={period}
              onChange={setPeriod}
              allLabel={t(loanListLabels.periodAll)}
              options={[{ value: CURRENT_PERIOD, label: `${t(loanListLabels.periodDue)} (${formatPeriod(CURRENT_PERIOD)})` }]}
            />
          </>
        }
      />
    </div>
  );
}
