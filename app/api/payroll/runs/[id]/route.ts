import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { mockResponse } from "@/lib/mock-api";
import { balanceByCostCenter } from "@/lib/payroll/run-journal";
import {
  findPeriod,
  findRun,
  payslipsOf,
  previewPosting,
  requirePermission,
  RUN_FILES,
  visiblePayslips,
} from "@/lib/payroll/run-server";
import { buildComparison } from "@/lib/payroll/runs";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  PayrollDeductionScheduleItem,
  PayrollInput,
  PayrollProfile,
  PayrollRun,
  Payslip,
  RunActivity,
  RunJournalLine,
} from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/payroll/runs/[id] — the run with everything its tabs show: payslips, warnings, scheduled deductions,
// the journal (posted, or a preview before posting), the audit trail and the comparison with the previous run (R-5).
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.run", "view");
    const run = await findRun(id);
    const [period, allPayslips, employees, profiles, scheduleAll, journalAll, activity, runs, inputs] = await Promise.all([
      findPeriod(run.payrollPeriodId),
      payslipsOf(id),
      collection<Employee>(COMP_FILES.employees),
      collection<PayrollProfile>(CONFIG_FILES.profiles),
      collection<PayrollDeductionScheduleItem>(RUN_FILES.schedule),
      collection<RunJournalLine>(RUN_FILES.journals),
      collection<RunActivity>(RUN_FILES.activity),
      collection<PayrollRun>(RUN_FILES.runs),
      collection<PayrollInput>(RUN_FILES.inputs),
    ]);

    const payslips = await visiblePayslips(request, allPayslips);
    const visible = new Set(payslips.map((p) => p.employeeId));
    const withEmployee = (p: Payslip) => ({ ...p, trace: [], employee: employees.find((e) => e.id === p.employeeId) ?? null });

    // previous run: the latest regular run of the profile in an earlier period that got past approval
    const previous = runs
      .filter((r) => r.profileId === run.profileId && r.runType === "Regular" && r.periodKey < run.periodKey && ["Posted", "Paid"].includes(r.status))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))[0];
    const comparison = buildComparison(run, payslips, previous ? { run: previous, payslips: await payslipsOf(previous.id) } : null);

    const posted = journalAll.filter((l) => l.runId === id);
    const journal = {
      posting: posted.filter((l) => l.kind === "Posting"),
      payment: posted.filter((l) => l.kind === "Payment"),
      reversal: posted.filter((l) => l.kind === "Reversal"),
      isPreview: false,
      previewRef: null as string | null,
    };
    if (journal.posting.length === 0 && allPayslips.length > 0 && run.status !== "Reversed") {
      const preview = await previewPosting(run);
      journal.posting = preview.lines;
      journal.isPreview = true;
      journal.previewRef = preview.journalRef;
    }

    const role = request.headers.get("x-mock-role");
    return {
      run,
      period,
      profile: profiles.find((p) => p.id === run.profileId) ?? null,
      payslips: payslips.map(withEmployee),
      schedule: scheduleAll.filter((s) => s.runId === id && (role !== "deptHead" || visible.has(s.employeeId))).map((s) => ({ ...s, employee: employees.find((e) => e.id === s.employeeId) ?? null })),
      claimedInputs: inputs.filter((i) => i.appliedRunId === id).length,
      journal: { ...journal, balance: { posting: balanceByCostCenter(journal.posting), payment: balanceByCostCenter(journal.payment), reversal: balanceByCostCenter(journal.reversal) } },
      activity: activity.filter((a) => a.runId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      comparison: { ...comparison, rows: comparison.rows.filter((r) => role !== "deptHead" || visible.has(r.employeeId)) },
    };
  });
}
