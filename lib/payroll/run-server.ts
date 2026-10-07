import { MockApiError } from "@/lib/mock-api";
import { actorFrom, CONFIG_FILES } from "@/lib/payroll/config-server";
import { COMP_FILES, loadBundle, minimumWage } from "@/lib/payroll/compensation-server";
import { appendLoanActivity, LOAN_FILES } from "@/lib/payroll/loan-server";
import { appendPenaltyActivity, PENALTY_FILES } from "@/lib/payroll/penalty-server";
import { can, DEPT_HEAD_DEPARTMENT, type PayrollAction, type PayrollSubject } from "@/lib/payroll/permissions";
import { addMonths, periodEnd } from "@/lib/payroll/periods";
import { isRole } from "@/lib/payroll/roles";
import { calculateRun, type RunCalcContext } from "@/lib/payroll/run-calc";
import { balanceByCostCenter, buildPaymentJournal, buildPostingJournal, buildReversalJournal, type AccountNames } from "@/lib/payroll/run-journal";
import { RUN_ACTIONS, RUN_ACTION_PERMISSION, type RunAction } from "@/lib/payroll/runs";
import { appendItems, collection, insertItem, removeWhere, updateItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  AttendanceSummary,
  DisciplinaryPenalty,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  EmployeeLoan,
  EmployeeLoanInstallment,
  GlAccount,
  LeavePeriod,
  LocalizedText,
  PayrollDeductionScheduleItem,
  PayrollInput,
  PayrollPeriod,
  PayrollRun,
  PenaltyInstallment,
  Payslip,
  PayslipLineRecord,
  RunActivity,
  RunJournalLine,
} from "@/lib/payroll/types";

// Server-only helpers of the payroll-cycle Route Handlers: store access, permission guards and the
// transition effects (calculate → submit → approve → post → pay → reverse) with their side effects on
// periods, loan / penalty instalments and inputs (spec-payroll-runs §3, R-1 … R-16).

export const RUN_FILES = {
  periods: "payroll/periods.json",
  inputs: "payroll/inputs.json",
  runs: "payroll/runs.json",
  payslips: "payroll/payslips.json",
  lines: "payroll/payslip-lines.json",
  schedule: "payroll/run-schedule-items.json",
  journals: "payroll/run-journals.json",
  activity: "payroll/run-activity-log.json",
  leavePeriods: "hr/leave-periods.json",
  holidays: "hr/holidays.json",
  attendance: "hr/attendance-summary.json",
} as const;

export function runRole(request: Request) {
  const value = request.headers.get("x-mock-role");
  return isRole(value) ? value : null;
}

/** HTTP 403 when a role is sent and lacks the action (no header = demo/curl access, always allowed). */
export function requirePermission(request: Request, subject: PayrollSubject, action: PayrollAction) {
  const role = runRole(request);
  if (role && !can(role, subject, action)) {
    throw new MockApiError(403, `Role ${role} may not ${action} ${subject}`);
  }
}

export const fail = (status: number, message: string, rule?: string, ar?: string, en?: string) =>
  new MockApiError(status, message, rule ? { form: { rule, message: { ar: ar ?? message, en: en ?? message } } } : undefined);

export async function findRun(id: string): Promise<PayrollRun> {
  const run = (await collection<PayrollRun>(RUN_FILES.runs)).find((r) => r.id === id);
  if (!run) throw new MockApiError(404, `Run ${id} not found`);
  return run;
}

export async function findPeriod(id: string): Promise<PayrollPeriod> {
  const period = (await collection<PayrollPeriod>(RUN_FILES.periods)).find((p) => p.id === id);
  if (!period) throw new MockApiError(404, `Period ${id} not found`);
  return period;
}

export async function payslipsOf(runId: string) {
  return (await collection<Payslip>(RUN_FILES.payslips)).filter((p) => p.runId === runId);
}

export async function appendRunActivity(request: Request, runId: string, action: RunActivity["action"], summary: LocalizedText) {
  const log = await collection<RunActivity>(RUN_FILES.activity);
  return insertItem<RunActivity>(RUN_FILES.activity, {
    id: `ra-${String(log.length + 1).padStart(4, "0")}-${Date.now().toString(36)}`,
    runId,
    action,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    summary,
  });
}

async function nextSeq(prefix: string, pick: (r: PayrollRun) => string | null) {
  const runs = await collection<PayrollRun>(RUN_FILES.runs);
  const max = runs.reduce((m, r) => Math.max(m, Number(pick(r)?.split("-")[2]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
export const nextRunNumber = async () => {
  const runs = await collection<PayrollRun>(RUN_FILES.runs);
  const max = runs.reduce((m, r) => Math.max(m, Number(r.runNo.split("-")[2]) || 0), 0);
  return `PR-2026-${String(max + 1).padStart(4, "0")}`;
};
export const nextJournalRef = () => nextSeq("JV-PAYRUN", (r) => r.journalRef);
export const nextPaymentRef = () => nextSeq("PV-PAYRUN", (r) => r.paymentRef);

export async function accountNames(): Promise<AccountNames> {
  const accounts = await collection<GlAccount>(CONFIG_FILES.glAccounts);
  return Object.fromEntries(accounts.map((a) => [a.code, a.name]));
}

/** What a role may see of a run's payslips: department heads their department only, employees none (spec §7). */
export async function visiblePayslips(request: Request, payslips: Payslip[]): Promise<Payslip[]> {
  const role = runRole(request);
  if (role === "employee") return [];
  if (role !== "deptHead") return payslips;
  const employees = await collection<Employee>(COMP_FILES.employees);
  const mine = new Set(employees.filter((e) => e.department === DEPT_HEAD_DEPARTMENT).map((e) => e.id));
  return payslips.filter((p) => mine.has(p.employeeId));
}

/** HTTP 409 when the transition is not offered by the status (state machine, spec §3.1). */
export function assertTransition(run: PayrollRun, action: RunAction) {
  if (!RUN_ACTIONS[run.status].includes(action)) {
    throw fail(409, `Action ${action} is not available in status ${run.status}`, "R-STATE",
      `الإجراء غير متاح بحالة «${run.status}»`, `Action not available in status “${run.status}”`);
  }
}

export const permissionOf = (action: RunAction) => RUN_ACTION_PERMISSION[action];

// ── calculation ───────────────────────────────────────────────────────────────────────────────────

async function loadCalcContext(run: PayrollRun, period: PayrollPeriod): Promise<RunCalcContext> {
  const [bundle, employees, compensations, overrides, attendance, leavePeriods, allInputs, loans, loanRows, penalties, penaltyRows, wage, payslips] =
    await Promise.all([
      loadBundle(),
      collection<Employee>(COMP_FILES.employees),
      collection<EmployeeCompensation>(COMP_FILES.compensations),
      collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
      collection<AttendanceSummary>(RUN_FILES.attendance),
      collection<LeavePeriod>(RUN_FILES.leavePeriods),
      collection<PayrollInput>(RUN_FILES.inputs),
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
      collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
      collection<PenaltyInstallment>(PENALTY_FILES.installments),
      minimumWage(),
      collection<Payslip>(RUN_FILES.payslips),
    ]);

  const loanById = new Map(loans.map((l) => [l.id, l]));
  const penaltyById = new Map(penalties.map((p) => [p.id, p]));
  const key = run.periodKey;
  return {
    run,
    period,
    bundle,
    employees,
    compensations,
    overrides,
    attendance,
    leavePeriods,
    inputs: allInputs.filter((i) => i.periodKey === key && i.status !== "Cancelled" && (i.appliedRunId === null || i.appliedRunId === run.id)),
    loanDue: loanRows
      .filter((r) => r.status === "Pending" && r.duePeriodId <= key && ["Disbursed", "Active"].includes(loanById.get(r.loanId)?.status ?? ""))
      .map((r) => ({ installmentId: r.id, sourceRef: `${loanById.get(r.loanId)!.loanNo} #${r.seqNo}`, employeeId: loanById.get(r.loanId)!.employeeId, amount: r.amount })),
    penaltyDue: penaltyRows
      .filter((r) => r.status === "Pending" && r.duePeriodId <= key && ["Approved", "Applying"].includes(penaltyById.get(r.penaltyId)?.status ?? ""))
      .map((r) => ({ installmentId: r.id, sourceRef: `${penaltyById.get(r.penaltyId)!.penaltyNo} #${r.seqNo}`, employeeId: penaltyById.get(r.penaltyId)!.employeeId, amount: r.amount })),
    minimumWage: wage,
    payslipIdFor: (employeeId) => {
      const candidate = `ps-${key}-${employeeId}`;
      const taken = payslips.find((p) => p.id === candidate && p.runId !== run.id);
      return taken ? `ps-${run.id}-${employeeId}` : candidate;
    },
  };
}

/** Frees everything a run holds (payslips, lines, schedule items, claimed inputs) — before a recalculation or a delete. */
async function release(run: PayrollRun) {
  const mine = new Set((await payslipsOf(run.id)).map((p) => p.id));
  await removeWhere<PayslipLineRecord>(RUN_FILES.lines, (l) => mine.has(l.payslipId));
  await removeWhere<Payslip>(RUN_FILES.payslips, (p) => p.runId === run.id);
  await removeWhere<PayrollDeductionScheduleItem>(RUN_FILES.schedule, (s) => s.runId === run.id);
  const inputs = await collection<PayrollInput>(RUN_FILES.inputs);
  for (const i of inputs) if (i.appliedRunId === run.id && i.status === "Pending") await updateItem<PayrollInput>(RUN_FILES.inputs, i.id, { appliedRunId: null });
}

export async function calculate(request: Request, run: PayrollRun, mode: "calculate" | "recalculate") {
  const period = await findPeriod(run.payrollPeriodId);
  if (period.status !== "Open") {
    throw fail(409, "The period is not open", "R-1", "الفترة غير مفتوحة — لا احتساب", "The period is not open — nothing can be calculated");
  }
  await release(run);
  const result = calculateRun(await loadCalcContext(run, period));
  await appendItems(RUN_FILES.payslips, result.payslips);
  await appendItems(RUN_FILES.lines, result.lines);
  await appendItems(RUN_FILES.schedule, result.schedule);
  for (const id of result.claimedInputIds) await updateItem<PayrollInput>(RUN_FILES.inputs, id, { appliedRunId: run.id });

  const now = new Date().toISOString();
  const updated = await updateItem<PayrollRun>(RUN_FILES.runs, run.id, {
    status: "Calculated",
    ...result.totals,
    warnings: result.warnings,
    calculatedAt: now,
    rejectionReason: null,
    updatedAt: now,
  });
  const n = result.totals.employeeCount;
  const blockers = result.warnings.filter((w) => w.severity === "Blocker").length;
  await appendRunActivity(request, run.id, mode === "calculate" ? "Calculated" : "Recalculated", {
    ar: `${mode === "calculate" ? "احتساب" : "إعادة احتساب"} ${n} قسيمة${blockers ? ` — ${blockers} تحذير مانع` : ""}`,
    en: `${mode === "calculate" ? "Calculated" : "Recalculated"} ${n} payslips${blockers ? ` — ${blockers} blocking warning(s)` : ""}`,
  });
  return updated!;
}

export function assertNoBlockers(run: PayrollRun) {
  const blockers = run.warnings.filter((w) => w.severity === "Blocker");
  if (blockers.length > 0) {
    throw fail(422, "The run has blocking warnings", "R-4",
      `لا يمكن الاعتماد: ${blockers.length} تحذير مانع — عالجها ثم أعد الاحتساب`,
      `Cannot approve: ${blockers.length} blocking warning(s) — resolve them and recalculate`);
  }
}

export async function deleteRun(request: Request, run: PayrollRun) {
  await release(run);
  await removeWhere<RunActivity>(RUN_FILES.activity, (a) => a.runId === run.id);
  await removeWhere<PayrollRun>(RUN_FILES.runs, (r) => r.id === run.id);
}

export async function setPeriodStatus(periodId: string, status: PayrollPeriod["status"]) {
  await updateItem<PayrollPeriod>(RUN_FILES.periods, periodId, { status });
}

// ── posting ───────────────────────────────────────────────────────────────────────────────────────

export async function previewPosting(run: PayrollRun) {
  const [payslips, allLines, names, journalRef] = await Promise.all([payslipsOf(run.id), collection<PayslipLineRecord>(RUN_FILES.lines), accountNames(), nextJournalRef()]);
  const ids = new Set(payslips.map((p) => p.id));
  const lines = buildPostingJournal({ run, payslips, lines: allLines.filter((l) => ids.has(l.payslipId)), names, journalRef });
  return { journalRef, lines, balance: balanceByCostCenter(lines) };
}

/** Recomputes the open balance of a loan from its instalments and moves its status (Disbursed ⇄ Active ⇄ Settled). */
async function refreshLoan(request: Request, loanId: string, note?: { action: "Deducted" | "Settled" | "Updated"; ar: string; en: string }) {
  const loan = (await collection<EmployeeLoan>(LOAN_FILES.loans)).find((l) => l.id === loanId);
  if (!loan) return;
  const rows = (await collection<EmployeeLoanInstallment>(LOAN_FILES.installments)).filter((r) => r.loanId === loanId);
  const balance = rows.filter((r) => r.status === "Pending").reduce((s, r) => s + r.amount, 0);
  const anyDeducted = rows.some((r) => r.status === "Deducted");
  const status = balance === 0 && anyDeducted ? "Settled" : anyDeducted ? "Active" : "Disbursed";
  if (!["Disbursed", "Active", "Settled"].includes(loan.status)) return;
  await updateItem<EmployeeLoan>(LOAN_FILES.loans, loanId, { outstandingBalance: balance, status, updatedAt: new Date().toISOString() });
  if (note) await appendLoanActivity(request, loanId, note.action, { ar: note.ar, en: note.en });
  if (status === "Settled" && loan.status !== "Settled") {
    await appendLoanActivity(request, loanId, "Settled", { ar: "اكتمل السداد بالراتب", en: "Fully repaid through payroll" });
  }
}

async function refreshPenalty(request: Request, penaltyId: string, note?: { action: "Deducted" | "Applied" | "Updated"; ar: string; en: string }) {
  const penalty = (await collection<DisciplinaryPenalty>(PENALTY_FILES.penalties)).find((p) => p.id === penaltyId);
  if (!penalty || !["Approved", "Applying", "Applied"].includes(penalty.status)) return;
  const rows = (await collection<PenaltyInstallment>(PENALTY_FILES.installments)).filter((r) => r.penaltyId === penaltyId);
  const remaining = rows.filter((r) => r.status === "Pending").reduce((s, r) => s + r.amount, 0);
  const anyDeducted = rows.some((r) => r.status === "Deducted");
  const status = remaining === 0 && anyDeducted ? "Applied" : anyDeducted ? "Applying" : "Approved";
  await updateItem<DisciplinaryPenalty>(PENALTY_FILES.penalties, penaltyId, { remainingAmount: remaining, status, updatedAt: new Date().toISOString() });
  if (note) await appendPenaltyActivity(request, penaltyId, note.action, { ar: note.ar, en: note.en });
  if (status === "Applied" && penalty.status !== "Applied") {
    await appendPenaltyActivity(request, penaltyId, "Applied", { ar: "اكتمل استقطاع العقوبة", en: "Penalty fully deducted" });
  }
}

export async function post(request: Request, run: PayrollRun) {
  const preview = await previewPosting(run);
  const unbalanced = preview.balance.filter((b) => !b.balanced);
  if (unbalanced.length > 0) {
    throw fail(422, "The journal is not balanced", "R-6", "القيد غير متوازن — لا يمكن الترحيل", "The journal is not balanced — cannot post");
  }
  const now = new Date().toISOString();
  await appendItems<RunJournalLine>(RUN_FILES.journals, preview.lines);

  // R-7: instalments deducted, balances reduced, inputs applied
  const schedule = (await collection<PayrollDeductionScheduleItem>(RUN_FILES.schedule)).filter((s) => s.runId === run.id);
  const touchedLoans = new Set<string>();
  const touchedPenalties = new Set<string>();
  for (const item of schedule) {
    if (item.sourceType === "EmployeeLoan" || item.sourceType === "DisciplinaryPenalty") {
      const isLoan = item.sourceType === "EmployeeLoan";
      const file = isLoan ? LOAN_FILES.installments : PENALTY_FILES.installments;
      const row = (await collection<EmployeeLoanInstallment & PenaltyInstallment>(file)).find((r) => r.id === item.sourceId);
      if (!row || item.appliedAmount <= 0) continue; // nothing taken this month: the instalment stays Pending for the next run
      const parent = isLoan ? (row as EmployeeLoanInstallment).loanId : (row as PenaltyInstallment).penaltyId;
      await updateItem<{ id: string } & Record<string, unknown>>(file, row.id, { status: "Deducted", deductedAmount: item.appliedAmount, payslipId: item.payslipId, ...(isLoan ? { deductedOn: now.slice(0, 10) } : {}) });
      if (item.deferredAmount > 0) {
        // the part the monthly cap pushed out becomes a new instalment next month
        const siblings = (await collection<EmployeeLoanInstallment & PenaltyInstallment>(file)).filter((r) => (isLoan ? (r as EmployeeLoanInstallment).loanId : (r as PenaltyInstallment).penaltyId) === parent);
        const seqNo = Math.max(...siblings.map((r) => r.seqNo)) + 1;
        const duePeriodId = addMonths(row.duePeriodId > run.periodKey ? row.duePeriodId : run.periodKey, 1);
        await insertItem(file, {
          id: `${parent}-i${seqNo}-${run.id}`,
          ...(isLoan ? { loanId: parent, dueDate: periodEnd(duePeriodId), settlementSource: null, deductedOn: null } : { penaltyId: parent }),
          seqNo,
          duePeriodId,
          amount: item.deferredAmount,
          deductedAmount: 0,
          status: "Pending",
          deferredFromSeqNo: row.seqNo,
          payslipId: null,
          carriedByRunId: run.id,
        } as never);
      }
      (isLoan ? touchedLoans : touchedPenalties).add(parent);
    }
  }
  for (const id of touchedLoans) {
    await refreshLoan(request, id, { action: "Deducted", ar: `استقطاع قسط بدورة ${run.runNo}`, en: `Instalment deducted by run ${run.runNo}` });
  }
  for (const id of touchedPenalties) {
    await refreshPenalty(request, id, { action: "Deducted", ar: `استقطاع قسط بدورة ${run.runNo}`, en: `Instalment deducted by run ${run.runNo}` });
  }
  // manual deductions the monthly cap cut: the deducted part is applied, the remainder moves to next month's inputs
  const nextKey = addMonths(run.periodKey, 1);
  for (const item of schedule.filter((x) => (x.sourceType === "Manual" || x.sourceType === "CourtOrder") && x.deferredAmount > 0)) {
    const input = (await collection<PayrollInput>(RUN_FILES.inputs)).find((i) => i.id === item.sourceId);
    if (!input) continue;
    if (item.appliedAmount > 0) {
      await updateItem<PayrollInput>(RUN_FILES.inputs, input.id, { amount: item.appliedAmount, originalAmount: input.amount });
      await insertItem<PayrollInput>(RUN_FILES.inputs, {
        ...input,
        id: `${input.id}-c-${run.id}`,
        periodKey: nextKey,
        amount: item.deferredAmount,
        originalAmount: undefined,
        status: "Pending",
        appliedRunId: null,
        carriedByRunId: run.id,
        carriedFromPeriodKey: null,
        reason: `${input.reason} (مرحَّل / carried)`,
        createdAt: now,
      });
    } else {
      await updateItem<PayrollInput>(RUN_FILES.inputs, input.id, { periodKey: nextKey, appliedRunId: null, status: "Pending", carriedByRunId: run.id, carriedFromPeriodKey: input.periodKey });
    }
  }
  for (const i of await collection<PayrollInput>(RUN_FILES.inputs)) {
    if (i.appliedRunId === run.id && i.status === "Pending") await updateItem<PayrollInput>(RUN_FILES.inputs, i.id, { status: "Applied" });
  }
  for (const s of schedule) await updateItem<PayrollDeductionScheduleItem>(RUN_FILES.schedule, s.id, { status: "Applied" });

  const updated = await updateItem<PayrollRun>(RUN_FILES.runs, run.id, {
    status: "Posted",
    journalRef: preview.journalRef,
    journalEntryId: `je-${preview.journalRef}`,
    postedAt: now,
    updatedAt: now,
  });
  await appendRunActivity(request, run.id, "Posted", { ar: `ترحيل القيد ${preview.journalRef}`, en: `Posted journal ${preview.journalRef}` });
  return { run: updated!, ...preview };
}

// ── payment ───────────────────────────────────────────────────────────────────────────────────────

export async function previewPayment(run: PayrollRun) {
  const [payslips, names, paymentRef] = await Promise.all([payslipsOf(run.id), accountNames(), nextPaymentRef()]);
  const lines = buildPaymentJournal({ run, payslips, names, journalRef: paymentRef });
  const sum = (method: "Bank" | "Cash") => payslips.filter((p) => p.paymentMethod === method && p.netPay > 0).reduce((s, p) => s + p.netPay, 0);
  const count = (method: "Bank" | "Cash") => payslips.filter((p) => p.paymentMethod === method && p.netPay > 0).length;
  return { paymentRef, lines, balance: balanceByCostCenter(lines), byMethod: { bank: { total: sum("Bank"), count: count("Bank") }, cash: { total: sum("Cash"), count: count("Cash") } } };
}

export async function pay(request: Request, run: PayrollRun) {
  const preview = await previewPayment(run);
  const now = new Date().toISOString();
  await appendItems<RunJournalLine>(RUN_FILES.journals, preview.lines);
  for (const p of await payslipsOf(run.id)) {
    if (p.netPay > 0) {
      await updateItem<Payslip>(RUN_FILES.payslips, p.id, { paidStatus: "Paid", paidDate: now.slice(0, 10), paymentDocRef: `${preview.paymentRef}/${p.employeeId.slice(4)}` });
    }
  }
  const updated = await updateItem<PayrollRun>(RUN_FILES.runs, run.id, { status: "Paid", paymentRef: preview.paymentRef, paidAt: now, updatedAt: now });
  if (run.runType === "Regular") await setPeriodStatus(run.payrollPeriodId, "Closed");
  await appendRunActivity(request, run.id, "Paid", { ar: `صرف الرواتب — ${preview.paymentRef}`, en: `Salaries paid — ${preview.paymentRef}` });
  return { run: updated!, ...preview };
}

// ── reversal ──────────────────────────────────────────────────────────────────────────────────────

export async function reverse(request: Request, run: PayrollRun, reason: string) {
  const journals = (await collection<RunJournalLine>(RUN_FILES.journals)).filter((l) => l.runId === run.id && l.kind === "Posting");
  const reversalRef = `${run.journalRef ?? "JV-PAYRUN"}-R`;
  const reversal = buildReversalJournal(journals, reversalRef);
  await appendItems<RunJournalLine>(RUN_FILES.journals, reversal);
  const now = new Date().toISOString();

  // R-8: instalments back to Pending, balances restored, inputs released, period re-opened
  const payslips = new Set((await payslipsOf(run.id)).map((p) => p.id));
  const loanRows = (await collection<EmployeeLoanInstallment>(LOAN_FILES.installments)).filter((r) => (r.payslipId && payslips.has(r.payslipId)) || r.carriedByRunId === run.id);
  const touchedLoans = new Set(loanRows.map((r) => r.loanId));
  await removeWhere<EmployeeLoanInstallment>(LOAN_FILES.installments, (r) => r.carriedByRunId === run.id);
  for (const r of loanRows.filter((x) => x.carriedByRunId !== run.id)) {
    await updateItem<EmployeeLoanInstallment>(LOAN_FILES.installments, r.id, { status: "Pending", deductedAmount: 0, payslipId: null, deductedOn: null });
  }
  const penaltyRows = (await collection<PenaltyInstallment>(PENALTY_FILES.installments)).filter((r) => (r.payslipId && payslips.has(r.payslipId)) || r.carriedByRunId === run.id);
  const touchedPenalties = new Set(penaltyRows.map((r) => r.penaltyId));
  await removeWhere<PenaltyInstallment>(PENALTY_FILES.installments, (r) => r.carriedByRunId === run.id);
  for (const r of penaltyRows.filter((x) => x.carriedByRunId !== run.id)) {
    await updateItem<PenaltyInstallment>(PENALTY_FILES.installments, r.id, { status: "Pending", deductedAmount: 0, payslipId: null });
  }
  for (const id of touchedLoans) await refreshLoan(request, id, { action: "Updated", ar: `عُكس استقطاع قسط بسبب عكس الدورة ${run.runNo}`, en: `Instalment deduction reversed with run ${run.runNo}` });
  for (const id of touchedPenalties) await refreshPenalty(request, id, { action: "Updated", ar: `عُكس استقطاع قسط بسبب عكس الدورة ${run.runNo}`, en: `Instalment deduction reversed with run ${run.runNo}` });
  await removeWhere<PayrollInput>(RUN_FILES.inputs, (i) => i.carriedByRunId === run.id && i.id.includes("-c-"));
  for (const i of await collection<PayrollInput>(RUN_FILES.inputs)) {
    if (i.carriedByRunId === run.id && i.carriedFromPeriodKey) {
      await updateItem<PayrollInput>(RUN_FILES.inputs, i.id, { periodKey: i.carriedFromPeriodKey, carriedByRunId: null, carriedFromPeriodKey: null, appliedRunId: null, status: "Pending" });
    } else if (i.appliedRunId === run.id) {
      await updateItem<PayrollInput>(RUN_FILES.inputs, i.id, { status: "Pending", appliedRunId: null, amount: i.originalAmount ?? i.amount, originalAmount: undefined });
    }
  }
  for (const s of (await collection<PayrollDeductionScheduleItem>(RUN_FILES.schedule)).filter((x) => x.runId === run.id)) {
    await updateItem<PayrollDeductionScheduleItem>(RUN_FILES.schedule, s.id, { status: "Released" });
  }
  if (run.runType === "Regular") await setPeriodStatus(run.payrollPeriodId, "Open");

  const updated = await updateItem<PayrollRun>(RUN_FILES.runs, run.id, { status: "Reversed", reversalReason: reason, reversedAt: now, updatedAt: now });
  await appendRunActivity(request, run.id, "Reversed", { ar: `عكس الدورة: ${reason}`, en: `Run reversed: ${reason}` });
  return { run: updated!, reversalRef, lines: reversal };
}

