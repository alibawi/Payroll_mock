"use client";

import { CircleCheck, CirclePlus, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useLocale } from "@/components/locale-provider";
import { Amount } from "@/components/payroll/amount";
import { JournalByCostCentre } from "@/components/payroll/run-actions";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  comparisonKindLabels,
  paidStatusLabels,
  paidStatusTones,
  runActivityLabels,
  runDetailLabels,
  scheduleSourceLabels,
  scheduleStatusLabels,
  warningCodeLabels,
  warningSeverityLabels,
  warningSeverityTones,
} from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { ComparisonRow } from "@/lib/payroll/runs";
import { formatStamp, type PayslipRow, type RunDetail, type ScheduleRow } from "@/lib/payroll/run-view";
import type { RunWarning } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types/hr";

function useEmployeeName() {
  const { locale } = useLocale();
  return (e: Employee | null | undefined) => (e ? (locale === "ar" ? e.fullNameAr : e.fullNameEn) : "—");
}

const EmployeeCell = ({ employee }: { employee: Employee | null }) => {
  const name = useEmployeeName();
  return (
    <div>
      <div className="font-medium">{name(employee)}</div>
      <div className="text-xs text-muted-foreground"><bdi dir="ltr">{employee?.employeeCode}</bdi></div>
    </div>
  );
};

// ── payslips ──────────────────────────────────────────────────────────────────────────────────────

export function PayslipsTab({ detail }: { detail: RunDetail }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const name = useEmployeeName();
  type Row = PayslipRow & { search: string };
  const rows: Row[] = detail.payslips.map((p) => ({ ...p, search: `${p.employee?.fullNameAr ?? ""} ${p.employee?.fullNameEn ?? ""} ${p.employee?.employeeCode ?? ""}` }));
  const warningsOf = (p: PayslipRow) => detail.run.warnings.filter((w) => w.payslipId === p.id && w.severity !== "Info");

  const columns: DataTableColumn<Row>[] = [
    { key: "employee", header: t(runDetailLabels.employee), sortValue: (r) => name(r.employee), cell: (r) => <EmployeeCell employee={r.employee} /> },
    { key: "department", header: t(runDetailLabels.department), cell: (r) => <span className="text-sm">{locale === "ar" ? r.employee?.department : r.employee?.departmentEn}</span> },
    { key: "gross", header: t(runDetailLabels.gross), sortValue: (r) => r.grossPay, cell: (r) => <Amount value={r.grossPay} /> },
    { key: "deductions", header: t(runDetailLabels.deductions), sortValue: (r) => r.totalEmployeeDeductions, cell: (r) => <Amount value={-r.totalEmployeeDeductions} signed /> },
    { key: "net", header: t(runDetailLabels.net), sortValue: (r) => r.netPay, cell: (r) => <Amount value={r.netPay} bold /> },
    {
      key: "flags",
      header: t(runDetailLabels.flags),
      cell: (r) => {
        const ws = warningsOf(r);
        return (
          <div className="flex flex-wrap gap-1">
            {r.netProtectionFlag && <StatusBadge tone={r.netProtectionFlag === "Blocked" ? "destructive" : "warning"} label={t(r.netProtectionFlag === "Blocked" ? runDetailLabels.blocked : runDetailLabels.spread)} className="text-[10px]" />}
            {ws.filter((w) => w.code !== "NET_PROTECTION_SPREAD" && w.code !== "NET_PROTECTION_BLOCK").map((w) => (
              <StatusBadge key={w.id} tone={warningSeverityTones[w.severity]} label={t(warningCodeLabels[w.code])} className="text-[10px]" />
            ))}
            {!r.netProtectionFlag && ws.length === 0 && <span className="text-muted-foreground">—</span>}
          </div>
        );
      },
    },
    { key: "paid", header: t(runDetailLabels.paid), cell: (r) => <StatusBadge label={t(paidStatusLabels[r.paidStatus])} tone={paidStatusTones[r.paidStatus]} /> },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchKeys={["search"]}
      searchPlaceholder={t({ ar: "بحث بالموظف", en: "Search by employee" })}
      emptyMessage={t(detail.run.status === "Draft" ? runDetailLabels.notCalculated : runDetailLabels.noPayslips)}
      onRowClick={(r) => router.push(`/payroll/runs/${detail.run.id}/payslips/${r.id}`)}
      footer={
        rows.length > 0 ? (
          <>
            <td className="px-3 py-2.5 font-semibold" colSpan={2}>{t({ ar: "الإجمالي", en: "Total" })}</td>
            <td className="px-3 py-2.5"><Amount value={detail.run.grossTotal} bold /></td>
            <td className="px-3 py-2.5"><Amount value={-detail.run.deductionTotal} signed bold /></td>
            <td className="px-3 py-2.5"><Amount value={detail.run.netTotal} bold /></td>
            <td colSpan={2} />
          </>
        ) : undefined
      }
    />
  );
}

// ── comparison (R-5) ──────────────────────────────────────────────────────────────────────────────

export function ComparisonTab({ detail }: { detail: RunDetail }) {
  const { t } = useLocale();
  const name = useEmployeeName();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const c = detail.comparison;
  const byEmployee = new Map(detail.payslips.map((p) => [p.employeeId, p.employee]));

  if (!c.previousRunId) return <p className="text-sm text-muted-foreground">{t(runDetailLabels.noPrevious)}</p>;

  const totalLabels: Record<string, { ar: string; en: string }> = {
    employeeCount: runDetailLabels.employees,
    grossTotal: runDetailLabels.gross,
    deductionTotal: runDetailLabels.deductions,
    netTotal: runDetailLabels.net,
    employerCostTotal: runDetailLabels.employerCost,
  };
  type Row = ComparisonRow & { search: string };
  const rows: Row[] = c.rows.filter((r) => !onlyFlagged || r.flagged).map((r) => ({ ...r, search: name(byEmployee.get(r.employeeId)) }));

  const columns: DataTableColumn<Row>[] = [
    { key: "employee", header: t(runDetailLabels.employee), sortValue: (r) => name(byEmployee.get(r.employeeId)), cell: (r) => <EmployeeCell employee={byEmployee.get(r.employeeId) ?? null} /> },
    { key: "current", header: t(runDetailLabels.current), sortValue: (r) => r.currentNet ?? 0, cell: (r) => (r.currentNet === null ? "—" : <Amount value={r.currentNet} />) },
    { key: "previous", header: t(runDetailLabels.previous), sortValue: (r) => r.previousNet ?? 0, cell: (r) => (r.previousNet === null ? "—" : <Amount value={r.previousNet} />) },
    { key: "diff", header: t(runDetailLabels.diff), sortValue: (r) => r.diff, cell: (r) => <Amount value={r.diff} signed /> },
    {
      key: "pct",
      header: t(runDetailLabels.pct),
      sortValue: (r) => r.pct ?? 0,
      cell: (r) => (r.pct === null ? "—" : <bdi dir="ltr" className={cn("tabular-nums", r.flagged && "font-semibold text-secondary-orange")}>{r.pct > 0 ? "+" : ""}{r.pct}%</bdi>),
    },
    {
      key: "kind",
      header: t(runDetailLabels.status),
      cell: (r) => <StatusBadge tone={r.flagged ? "warning" : "neutral"} label={t(comparisonKindLabels[r.kind])} />,
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t(runDetailLabels.comparedWith)} <bdi dir="ltr" className="font-mono font-medium text-foreground">{c.previousRunNo}</bdi> ({formatPeriod(c.previousPeriodKey)})
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-start font-medium" />
              <th className="px-3 py-2.5 text-end font-medium">{t(runDetailLabels.current)}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t(runDetailLabels.previous)}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t(runDetailLabels.diff)}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t(runDetailLabels.pct)}</th>
            </tr>
          </thead>
          <tbody>
            {c.totals.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">{t(totalLabels[row.key])}</td>
                {row.key === "employeeCount" ? (
                  <>
                    <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{row.current}</bdi></td>
                    <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{row.previous}</bdi></td>
                    <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{row.diff > 0 ? "+" : ""}{row.diff}</bdi></td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2.5 text-end"><Amount value={row.current} /></td>
                    <td className="px-3 py-2.5 text-end"><Amount value={row.previous} /></td>
                    <td className="px-3 py-2.5 text-end"><Amount value={row.diff} signed /></td>
                  </>
                )}
                <td className="px-3 py-2.5 text-end tabular-nums">{row.pct === null ? "—" : <bdi dir="ltr">{row.pct > 0 ? "+" : ""}{row.pct}%</bdi>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t(runDetailLabels.flaggedNote)}</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onlyFlagged} onCheckedChange={(v) => setOnlyFlagged(v === true)} />
          {t(runDetailLabels.onlyFlagged)}
        </label>
      </div>
      <DataTable data={rows} columns={columns} getRowId={(r) => r.employeeId} searchKeys={["search"]} searchPlaceholder={t({ ar: "بحث بالموظف", en: "Search by employee" })} pageSize={8} emptyMessage={t({ ar: "لا اختلافات", en: "No differences" })} />
    </div>
  );
}

// ── warnings ──────────────────────────────────────────────────────────────────────────────────────

export function WarningsTab({ detail }: { detail: RunDetail }) {
  const { t } = useLocale();
  const name = useEmployeeName();
  const employees = new Map(detail.payslips.map((p) => [p.employeeId, p.employee]));
  const order = { Blocker: 0, Warning: 1, Info: 2 } as const;
  const warnings = [...detail.run.warnings].sort((a, b) => order[a.severity] - order[b.severity]);

  if (warnings.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-secondary-green" />
        {t(runDetailLabels.noWarnings)}
      </p>
    );
  }
  const columns: DataTableColumn<RunWarning>[] = [
    { key: "severity", header: t(runDetailLabels.severity), cell: (w) => <StatusBadge tone={warningSeverityTones[w.severity]} label={t(warningSeverityLabels[w.severity])} /> },
    { key: "code", header: t(runDetailLabels.code), cell: (w) => t(warningCodeLabels[w.code]) },
    {
      key: "employee",
      header: t(runDetailLabels.employee),
      cell: (w) => {
        if (!w.employeeId) return "—";
        const e = employees.get(w.employeeId);
        return w.payslipId ? (
          <Link href={`/payroll/runs/${detail.run.id}/payslips/${w.payslipId}`} className="text-primary hover:underline">{e ? name(e) : w.employeeId}</Link>
        ) : (
          <span>{e ? name(e) : w.employeeId}</span>
        );
      },
    },
    { key: "message", header: t(runDetailLabels.message), cell: (w) => <span className="text-sm">{t(w.message)}</span> },
  ];
  return <DataTable data={warnings} columns={columns} getRowId={(w) => w.id} pageSize={10} />;
}

// ── scheduled deductions (the bridge "due this month") ───────────────────────────────────────────

export function DeductionsTab({ detail }: { detail: RunDetail }) {
  const { t } = useLocale();
  const name = useEmployeeName();
  const columns: DataTableColumn<ScheduleRow>[] = [
    { key: "employee", header: t(runDetailLabels.employee), sortValue: (r) => name(r.employee), cell: (r) => <EmployeeCell employee={r.employee} /> },
    { key: "source", header: t(runDetailLabels.source), cell: (r) => t(scheduleSourceLabels[r.sourceType]) },
    { key: "ref", header: t(runDetailLabels.reference), cell: (r) => <bdi dir="ltr" className="font-mono text-xs">{r.sourceRef}</bdi> },
    { key: "due", header: t(runDetailLabels.due), sortValue: (r) => r.amount, cell: (r) => <Amount value={r.amount} /> },
    { key: "applied", header: t(runDetailLabels.applied), sortValue: (r) => r.appliedAmount, cell: (r) => <Amount value={r.appliedAmount} bold /> },
    { key: "deferred", header: t(runDetailLabels.deferred), sortValue: (r) => r.deferredAmount, cell: (r) => (r.deferredAmount > 0 ? <span className="text-secondary-orange"><Amount value={r.deferredAmount} /></span> : <span className="text-muted-foreground">—</span>) },
    { key: "status", header: t(runDetailLabels.status), cell: (r) => <StatusBadge tone={r.status === "Applied" ? "success" : r.status === "Released" ? "neutral" : "info"} label={t(scheduleStatusLabels[r.status])} /> },
  ];
  const total = detail.schedule.reduce((s, r) => s + r.appliedAmount, 0);
  return (
    <DataTable
      data={detail.schedule}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={10}
      emptyMessage={t(runDetailLabels.noSchedule)}
      footer={
        detail.schedule.length > 0 ? (
          <>
            <td className="px-3 py-2.5 font-semibold" colSpan={4}>{t({ ar: "الإجمالي المستقطع", en: "Total applied" })}</td>
            <td className="px-3 py-2.5"><Amount value={total} bold /></td>
            <td colSpan={2} />
          </>
        ) : undefined
      }
    />
  );
}

// ── journal ───────────────────────────────────────────────────────────────────────────────────────

export function JournalTab({ detail }: { detail: RunDetail }) {
  const { t } = useLocale();
  const j = detail.journal;
  if (j.posting.length === 0) return <p className="text-sm text-muted-foreground">{t(runDetailLabels.noJournal)}</p>;
  const unbalanced = j.balance.posting.some((b) => !b.balanced);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{t(j.isPreview ? runDetailLabels.previewJournal : runDetailLabels.postingEntry)}</h3>
          <StatusBadge tone={unbalanced ? "destructive" : "success"} label={t(unbalanced ? runDetailLabels.unbalanced : runDetailLabels.balanced)} />
        </div>
        <JournalByCostCentre lines={j.posting} reference={j.isPreview ? (j.previewRef ?? undefined) : j.posting[0]?.journalRef} />
      </section>
      {j.payment.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t(runDetailLabels.paymentEntry)}</h3>
          <JournalByCostCentre lines={j.payment} reference={j.payment[0]?.journalRef} />
        </section>
      )}
      {j.reversal.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive">{t(runDetailLabels.reversalEntry)}</h3>
          <JournalByCostCentre lines={j.reversal} reference={j.reversal[0]?.journalRef} />
        </section>
      )}
    </div>
  );
}

// ── activity ──────────────────────────────────────────────────────────────────────────────────────

export function ActivityTab({ detail, reload }: { detail: RunDetail; reload: () => void }) {
  const { t } = useLocale();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/payroll/runs/${detail.run.id}/transition`, { method: "POST", body: { action: "comment", text: comment } });
      setComment("");
      reload();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      setBusy(false);
    }
  }

  const icons = { Created: CirclePlus, Submitted: Send, Rejected: TriangleAlert } as const;
  const items: TimelineItem[] = detail.activity.map((a) => ({
    id: a.id,
    icon: icons[a.action as keyof typeof icons],
    title: a.action === "Comment" ? t(runActivityLabels.Comment) : `${t(runActivityLabels[a.action])} — ${t(a.summary)}`,
    description: (
      <>
        {a.action === "Comment" && <span className="block text-foreground">{t(a.summary)}</span>}
        {t(a.actor.name)}
      </>
    ),
    timestamp: formatStamp(a.timestamp),
  }));

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t(runDetailLabels.commentPlaceholder)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button type="button" variant="outline" onClick={send} disabled={busy || !comment.trim()}>{t(runDetailLabels.send)}</Button>
      </div>
      <Timeline items={items} />
    </div>
  );
}
