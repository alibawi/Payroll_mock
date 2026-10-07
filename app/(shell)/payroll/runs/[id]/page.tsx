"use client";

import { BadgeCheck, BookCheck, Calculator, CircleDollarSign, RefreshCw, Send, ThumbsDown, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { RunActionDialog, type RunDialogKind } from "@/components/payroll/run-actions";
import { ActivityTab, ComparisonTab, DeductionsTab, JournalTab, PayslipsTab, WarningsTab } from "@/components/payroll/run-tabs";
import { type Role } from "@/components/role-provider";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowActionBar, type WorkflowAction } from "@/components/workflow-action-bar";
import { commonLabels, roleLabels } from "@/lib/i18n/labels";
import {
  periodStatusLabels,
  periodStatusTones,
  runActionLabels,
  runBannerLabels,
  runDetailLabels,
  runDialogLabels,
  runStatusLabels,
  runStatusTones,
  runTypeLabels,
} from "@/lib/i18n/payroll-run-labels";
import { ApiError, apiFetch, useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import { can, DEFAULT_PERMISSIONS } from "@/lib/payroll/permissions";
import { formatPeriod } from "@/lib/payroll/periods";
import { RUN_ACTIONS, RUN_ACTION_PERMISSION, type RunAction } from "@/lib/payroll/runs";
import { formatStamp, type RunDetail } from "@/lib/payroll/run-view";
import { useCanSeeAmounts } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

const ICONS: Record<RunAction, typeof Send> = {
  calculate: Calculator,
  recalculate: RefreshCw,
  submit: Send,
  approve: BadgeCheck,
  reject: ThumbsDown,
  post: BookCheck,
  pay: CircleDollarSign,
  reverse: Undo2,
  delete: Trash2,
};

/** Roles whose default permissions include the run action (the WorkflowActionBar filters by role). */
const rolesFor = (action: RunAction): Role[] =>
  (Object.keys(DEFAULT_PERMISSIONS) as Role[]).filter((r) => can(r, "payroll.run", RUN_ACTION_PERMISSION[action]));

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const seeAmounts = useCanSeeAmounts();
  const money = (value: number) => (seeAmounts ? value.toLocaleString("en-US") : "••••••");
  const router = useRouter();
  const detail = useApi<RunDetail>(`/api/payroll/runs/${id}`);
  const [dialog, setDialog] = useState<RunDialogKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState("payslips");

  const d = detail.data;
  if (detail.error) {
    return (
      <EmptyState title={runDetailLabels.notFound} description={{ ar: detail.error, en: detail.error }}>
        <Link href="/payroll/runs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>{t(runDetailLabels.backToList)}</Link>
      </EmptyState>
    );
  }
  if (!d) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { run, period, profile } = d;
  const blockers = run.warnings.filter((w) => w.severity === "Blocker");
  const warnings = run.warnings.filter((w) => w.severity === "Warning");

  async function exec(action: RunAction) {
    setActionError(null);
    try {
      await apiFetch(`/api/payroll/runs/${id}/transition`, { method: "POST", body: { action } });
      if (action === "delete") router.push("/payroll/runs");
      else detail.reload();
    } catch (e) {
      const message = e instanceof ApiError ? Object.values(e.fieldErrors ?? {})[0]?.message : undefined;
      setActionError(message ? t(message) : (e as Error).message);
    }
  }

  const confirmTexts: Partial<Record<RunAction, { title: { ar: string; en: string }; body: { ar: string; en: string } }>> = {
    calculate: { title: runDialogLabels.calculateTitle, body: runDialogLabels.calculateBody },
    recalculate: { title: runDialogLabels.calculateTitle, body: runDialogLabels.calculateBody },
    submit: { title: runDialogLabels.submitTitle, body: runDialogLabels.submitBody },
    approve: { title: runDialogLabels.approveTitle, body: runDialogLabels.approveBody },
    delete: { title: runDialogLabels.deleteTitle, body: runDialogLabels.deleteBody },
  };
  const dialogActions: RunAction[] = ["reject", "post", "pay", "reverse"];
  const needsPayslips = run.employeeCount === 0;

  const actions: WorkflowAction[] = RUN_ACTIONS[run.status].map((action) => {
    const confirm = confirmTexts[action];
    const blocked = (action === "submit" || action === "approve") && (blockers.length > 0 || needsPayslips);
    return {
      key: action,
      label: t(runActionLabels[action]),
      icon: ICONS[action],
      roles: rolesFor(action),
      variant: action === "reverse" || action === "delete" || action === "reject" ? "outline" : "default",
      disabled: blocked,
      disabledReason: blocked ? t(runDialogLabels.blockersBody) : undefined,
      confirm: confirm ? { title: t(confirm.title), description: t(confirm.body) } : undefined,
      onClick: () => (dialogActions.includes(action) ? setDialog(action as RunDialogKind) : exec(action)),
    };
  });

  const scopeText = [
    ...run.scopeFilter.departments,
    ...run.scopeFilter.costCenters,
    ...(run.scopeFilter.employeeIds.length ? [`${run.scopeFilter.employeeIds.length} ${t(runDetailLabels.employees)}`] : []),
  ].join("، ");
  const profileName = profile ? t(profile.name) : run.profileId;

  return (
    <div className="space-y-5">
      <PageHeader
        title={{ ar: run.runNo, en: run.runNo }}
        description={{ ar: `${profile?.name.ar ?? ""} — ${formatPeriod(run.periodKey)}`, en: `${profile?.name.en ?? ""} — ${formatPeriod(run.periodKey)}` }}
        actions={<StatusBadge label={t(runStatusLabels[run.status])} tone={runStatusTones[run.status]} />}
      />

      <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{t(runBannerLabels[run.status])}</p>

      {run.rejectionReason && run.status === "Calculated" && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">{t(runDetailLabels.rejection)}:</span> {run.rejectionReason}
        </div>
      )}
      {run.reversalReason && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">{t(runDetailLabels.reversalReason)}:</span> {run.reversalReason}
        </div>
      )}
      {blockers.length > 0 && RUN_ACTIONS[run.status].includes("submit") && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">{blockers.length} {t({ ar: "تحذير مانع", en: "blocking warning(s)" })}</p>
            <p className="text-muted-foreground">{t(runDialogLabels.blockersBody)}</p>
          </div>
        </div>
      )}
      {actionError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p>}

      <WorkflowActionBar actions={actions} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard title={t(runDetailLabels.employees)} value={run.employeeCount} tone="neutral" />
        <KPICard title={t(runDetailLabels.gross)} value={money(run.grossTotal)} />
        <KPICard title={t(runDetailLabels.deductions)} value={money(run.deductionTotal)} tone="warning" />
        <KPICard title={t(runDetailLabels.net)} value={money(run.netTotal)} tone="success" />
        <KPICard title={t(runDetailLabels.employerCost)} value={money(run.employerCostTotal)} tone="info" />
      </div>

      <DetailSection title={t({ ar: "بيانات الدورة", en: "Run details" })}>
        <DetailGrid>
          <DetailField label={t(runDetailLabels.profile)}>{profileName}</DetailField>
          <DetailField label={t(runDetailLabels.period)}>
            <span className="flex items-center gap-2">
              <bdi dir="ltr">{formatPeriod(run.periodKey)}</bdi>
              <StatusBadge label={t(periodStatusLabels[period.status])} tone={periodStatusTones[period.status]} className="text-[10px]" />
            </span>
          </DetailField>
          <DetailField label={t(runDetailLabels.type)}>{t(runTypeLabels[run.runType])}</DetailField>
          <DetailField label={t(runDetailLabels.scope)}>{scopeText || t(runDetailLabels.allEmployees)}</DetailField>
          <DetailField label={t(runDetailLabels.calculatedAt)}>{formatStamp(run.calculatedAt)}</DetailField>
          <DetailField label={t(runDetailLabels.approvedBy)}>
            {run.approvedBy ? `${t(roleLabels[run.approvedBy as Role] ?? { ar: run.approvedBy, en: run.approvedBy })} · ${formatStamp(run.approvedAt)}` : ""}
          </DetailField>
          <DetailField label={t(runDetailLabels.journalRef)}>{run.journalRef && <bdi dir="ltr" className="font-mono">{run.journalRef}</bdi>}</DetailField>
          <DetailField label={t(runDetailLabels.paymentRef)}>{run.paymentRef && <bdi dir="ltr" className="font-mono">{run.paymentRef}</bdi>}</DetailField>
          <DetailField label={t(runDetailLabels.claimedInputs)}>
            {d.claimedInputs > 0 ? (
              <Link href="/payroll/inputs" className="text-primary hover:underline">{d.claimedInputs}</Link>
            ) : (
              ""
            )}
          </DetailField>
          {run.reversalRunId && (
            <DetailField label={t(runDetailLabels.replacedBy)}>
              <Link href={`/payroll/runs/${run.reversalRunId}`} className="font-mono text-primary hover:underline"><bdi dir="ltr">{run.reversalRunId}</bdi></Link>
            </DetailField>
          )}
          <DetailField label={t({ ar: "تاريخ الدفع", en: "Pay date" })}><bdi dir="ltr">{formatDate(period.payDate)}</bdi></DetailField>
          <DetailField label={t({ ar: "ملاحظة", en: "Note" })}>{run.note}</DetailField>
        </DetailGrid>
      </DetailSection>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="payslips">{t(runDetailLabels.tabPayslips)}<Count n={d.payslips.length} /></TabsTrigger>
          <TabsTrigger value="comparison">{t(runDetailLabels.tabComparison)}</TabsTrigger>
          <TabsTrigger value="warnings">
            {t(runDetailLabels.tabWarnings)}
            <Count n={blockers.length + warnings.length} tone={blockers.length ? "destructive" : warnings.length ? "warning" : undefined} />
          </TabsTrigger>
          <TabsTrigger value="deductions">{t(runDetailLabels.tabDeductions)}<Count n={d.schedule.length} /></TabsTrigger>
          <TabsTrigger value="journal">{t(runDetailLabels.tabJournal)}</TabsTrigger>
          <TabsTrigger value="activity">{t(runDetailLabels.tabActivity)}</TabsTrigger>
        </TabsList>
        <TabsContent value="payslips" className="pt-4"><PayslipsTab detail={d} /></TabsContent>
        <TabsContent value="comparison" className="pt-4"><ComparisonTab detail={d} /></TabsContent>
        <TabsContent value="warnings" className="pt-4"><WarningsTab detail={d} /></TabsContent>
        <TabsContent value="deductions" className="pt-4"><DeductionsTab detail={d} /></TabsContent>
        <TabsContent value="journal" className="pt-4"><JournalTab detail={d} /></TabsContent>
        <TabsContent value="activity" className="pt-4"><ActivityTab detail={d} reload={detail.reload} /></TabsContent>
      </Tabs>

      {dialog && (
        <RunActionDialog
          kind={dialog}
          run={run}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}

function Count({ n, tone }: { n: number; tone?: "destructive" | "warning" }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 text-[11px] tabular-nums",
        tone === "destructive" ? "bg-destructive/15 text-destructive" : tone === "warning" ? "bg-secondary-orange/15 text-secondary-orange" : "bg-muted-foreground/15"
      )}
    >
      {n}
    </span>
  );
}
