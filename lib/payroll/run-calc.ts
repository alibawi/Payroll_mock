import { calculatePayslip, type EngineDeductionItem, type EngineEarningInput, type EngineResult, type EngineTime } from "@/lib/payroll/engine";
import type { ConfigBundle } from "@/lib/payroll/preview";
import type { Employee } from "@/lib/types/hr";
import type {
  AttendanceSummary,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  LeavePeriod,
  PayrollDeductionScheduleItem,
  PayrollInput,
  PayrollPeriod,
  PayrollRun,
  Payslip,
  PayslipLineRecord,
  RunScope,
  RunWarning,
} from "@/lib/payroll/types";

// Whole-run orchestration over plain data arrays (no store, no I/O): resolves who is in the run, builds each
// employee's engine input from compensation + attendance + inputs + due instalments, runs the engine and
// collects payslips, lines, schedule items, warnings and totals. Used by the calculate endpoint and the seed generator.

export type DueInstallment = { installmentId: string; sourceRef: string; employeeId: string; amount: number };

export type RunCalcContext = {
  run: Pick<PayrollRun, "id" | "runType" | "profileId" | "periodKey"> & { scopeFilter: RunScope };
  period: Pick<PayrollPeriod, "startDate" | "endDate" | "periodKey">;
  bundle: ConfigBundle;
  employees: Employee[];
  compensations: EmployeeCompensation[];
  overrides: EmployeeCompensationComponent[];
  attendance: AttendanceSummary[];
  leavePeriods: LeavePeriod[];
  /** Inputs this run may pick up (Pending of the period, or already claimed by this run). */
  inputs: PayrollInput[];
  loanDue: DueInstallment[];
  penaltyDue: DueInstallment[];
  minimumWage: number;
  payslipIdFor: (employeeId: string) => string;
};

export type RunCalcResult = {
  payslips: Payslip[];
  lines: PayslipLineRecord[];
  schedule: PayrollDeductionScheduleItem[];
  warnings: RunWarning[];
  /** Inputs the run took (they become Applied when the run is posted). */
  claimedInputIds: string[];
  totals: { employeeCount: number; grossTotal: number; deductionTotal: number; netTotal: number; employerCostTotal: number };
  results: Record<string, EngineResult>;
};

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const daysInclusive = (from: string, to: string) => Math.max(0, Math.round((utc(to) - utc(from)) / DAY) + 1);
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

export function calendarDaysOf(periodKey: string): number {
  const [y, m] = periodKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function inScope(employee: Employee, comp: EmployeeCompensation | undefined, scope: RunScope): boolean {
  if (scope.employeeIds.length && !scope.employeeIds.includes(employee.id)) return false;
  if (scope.departments.length && !scope.departments.includes(employee.department) && !scope.departments.includes(employee.departmentEn)) return false;
  if (scope.costCenters.length && !scope.costCenters.includes(comp?.costCenterId ?? employee.costCenter)) return false;
  return true;
}

/** The compensation covering the period: the latest record that overlaps it. */
export function compensationFor(compensations: EmployeeCompensation[], employeeId: string, start: string, end: string) {
  return compensations
    .filter((c) => c.employeeId === employeeId && c.effectiveFrom <= end && (c.effectiveTo == null || c.effectiveTo >= start))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

export function calculateRun(ctx: RunCalcContext): RunCalcResult {
  const { run, period, bundle } = ctx;
  const supplementary = run.runType !== "Regular";
  const profile = bundle.profiles.find((p) => p.id === run.profileId);
  const payslips: Payslip[] = [];
  const lines: PayslipLineRecord[] = [];
  const schedule: PayrollDeductionScheduleItem[] = [];
  const warnings: RunWarning[] = [];
  const claimedInputIds = new Set<string>();
  const results: Record<string, EngineResult> = {};
  const calendarDays = calendarDaysOf(period.periodKey);
  let warningSeq = 0;
  const addWarning = (w: Omit<RunWarning, "id">) => warnings.push({ id: `${run.id}-w${++warningSeq}`, ...w });
  const byId = new Map(bundle.components.map((c) => [c.id, c]));

  const employees = [...ctx.employees].sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
  for (const employee of employees) {
    const comp = compensationFor(ctx.compensations, employee.id, period.startDate, period.endDate);
    const employed = employee.joiningDate <= period.endDate && (!employee.terminationDate || employee.terminationDate >= period.startDate);
    if (!employed || !inScope(employee, comp, run.scopeFilter)) continue;

    if (!comp) {
      // R-2: employees of the scope without any effective compensation are reported and left out of regular runs.
      const everHad = ctx.compensations.some((c) => c.employeeId === employee.id);
      if (!supplementary && !everHad && (employee.status === "active" || employee.status === "on_leave")) {
        addWarning({
          severity: "Warning",
          code: "NO_COMPENSATION",
          employeeId: employee.id,
          payslipId: null,
          message: { ar: "الموظف بلا تعويض نافذ — استُثني من الدورة", en: "Employee has no effective compensation — excluded from the run" },
        });
      }
      continue;
    }
    if (comp.profileId !== run.profileId) continue;

    const myInputs = ctx.inputs.filter((i) => i.employeeId === employee.id && i.status !== "Cancelled");
    if (supplementary && myInputs.length === 0) continue;

    const attendance = ctx.attendance.find((a) => a.employeeId === employee.id && a.periodId === period.periodKey);
    const from = max(max(period.startDate, comp.effectiveFrom), employee.joiningDate);
    const to = min(min(period.endDate, comp.effectiveTo ?? period.endDate), employee.terminationDate ?? period.endDate);
    const coverageDays = Math.min(calendarDays, daysInclusive(from, to));
    const paidLeaveDays = ctx.leavePeriods
      .filter((l) => l.employeeId === employee.id && l.isPaid && l.startDate <= period.endDate && l.endDate >= period.startDate)
      .reduce((s, l) => s + daysInclusive(max(l.startDate, period.startDate), min(l.endDate, period.endDate)), 0);
    const time: EngineTime = {
      workingDays: attendance?.workingDays ?? 26,
      calendarDays: attendance?.calendarDays ?? calendarDays,
      absenceDays: attendance?.absenceDays ?? 0,
      lateEvents: attendance?.lateEvents ?? [],
      lwpDays: attendance?.lwpDays ?? 0,
      overtimeHours: attendance?.overtimeHours ?? 0,
      paidLeaveDays,
      coverageDays,
      hasAttendanceData: Boolean(attendance),
    };

    const earningInputs: EngineEarningInput[] = [];
    const deductionItems: EngineDeductionItem[] = [];
    for (const input of myInputs) {
      const component = byId.get(input.componentId);
      if (!component) continue;
      claimedInputIds.add(input.id);
      if (component.componentType === "Earning") {
        earningInputs.push({ id: input.id, componentId: input.componentId, amount: input.amount, quantity: input.quantity, reason: input.reason });
      } else {
        deductionItems.push({
          sourceType: component.category === "CourtOrder" ? "CourtOrder" : "Manual",
          sourceId: input.id,
          ref: `${component.name.en}: ${input.reason}`,
          amount: input.amount,
          componentId: input.componentId,
        });
      }
    }
    if (!supplementary) {
      for (const d of ctx.loanDue.filter((x) => x.employeeId === employee.id)) {
        deductionItems.push({ sourceType: "EmployeeLoan", sourceId: d.installmentId, ref: d.sourceRef, amount: d.amount });
      }
      for (const d of ctx.penaltyDue.filter((x) => x.employeeId === employee.id)) {
        deductionItems.push({ sourceType: "DisciplinaryPenalty", sourceId: d.installmentId, ref: d.sourceRef, amount: d.amount });
      }
    }

    const overrides = ctx.overrides.filter((o) => o.compensationId === comp.id);
    const result = calculatePayslip({
      periodKey: period.periodKey,
      periodEnd: period.endDate,
      compensation: {
        profileId: comp.profileId,
        salaryStructureId: comp.salaryStructureId,
        gradeStepId: comp.gradeStepId,
        baseSalary: comp.baseSalary,
        taxMaritalStatus: comp.taxMaritalStatus,
        eligibleChildrenCount: comp.eligibleChildrenCount,
        isPensionExempt: comp.isPensionExempt,
        overrides,
      },
      bundle,
      time,
      earningInputs,
      deductionItems,
      mode: supplementary ? "supplementary" : "full",
    });

    const payslipId = ctx.payslipIdFor(employee.id);
    results[payslipId] = result;
    const lateEventsCounted = time.lateEvents.filter((m) => m > (profile?.attendancePenaltyPolicy.graceMinutes ?? 0)).length;
    payslips.push({
      id: payslipId,
      runId: run.id,
      periodKey: period.periodKey,
      employeeId: employee.id,
      compensationId: comp.id,
      currencyCode: comp.currencyCode,
      workedDays: result.workedDays,
      paidLeaveDays,
      unpaidLeaveDays: time.lwpDays,
      overtimeHours: time.overtimeHours,
      absenceDays: time.absenceDays,
      lateEvents: lateEventsCounted,
      lateMinutes: time.lateEvents.filter((m) => m > 0).reduce((a, b) => a + b, 0),
      dayRate: result.dayRate,
      grossEarnings: result.grossEarnings,
      absenceDeduction: result.absenceDeduction,
      latenessDeduction: result.latenessDeduction,
      grossPay: result.grossPay,
      taxableBase: result.taxableBase,
      pensionableBase: result.pensionableBase,
      socialSecurityBase: result.socialSecurityBase,
      incomeTax: result.incomeTax,
      totalEmployeeDeductions: result.totalEmployeeDeductions,
      netPay: result.netPay,
      employerContribution: result.employerContribution,
      employerCost: result.employerCost,
      paymentMethod: comp.paymentMethod,
      bankAccountNo: comp.bankAccountNo,
      costCenterId: comp.costCenterId,
      paidStatus: "Unpaid",
      paidDate: null,
      paymentDocRef: null,
      netProtectionFlag: result.netProtectionFlag,
      trace: result.trace,
    });
    result.lines.forEach((line, i) => lines.push({ ...line, id: `${payslipId}-l${i + 1}`, payslipId }));
    result.schedule.forEach((s, i) =>
      schedule.push({
        id: `${payslipId}-s${i + 1}`,
        runId: run.id,
        employeeId: employee.id,
        periodKey: period.periodKey,
        sourceType: s.sourceType,
        sourceId: s.sourceId,
        sourceRef: s.ref,
        amount: s.amount,
        appliedAmount: s.applied,
        deferredAmount: s.deferred,
        status: "Planned",
        payslipId,
      })
    );
    for (const w of result.warnings) addWarning({ ...w, employeeId: employee.id, payslipId });
    if (!supplementary && result.grossEarnings < ctx.minimumWage && time.coverageDays >= time.calendarDays) {
      addWarning({
        severity: "Warning",
        code: "BELOW_MINIMUM_WAGE",
        employeeId: employee.id,
        payslipId,
        amount: result.grossEarnings,
        message: {
          ar: `إجمالي الاستحقاقات (${result.grossEarnings.toLocaleString("en-US")}) أقل من الحد الأدنى للأجور (${ctx.minimumWage.toLocaleString("en-US")})`,
          en: `Gross earnings (${result.grossEarnings.toLocaleString("en-US")}) are below the minimum wage (${ctx.minimumWage.toLocaleString("en-US")})`,
        },
      });
    }
  }

  const sum = (pick: (p: Payslip) => number) => payslips.reduce((s, p) => s + pick(p), 0);
  return {
    payslips,
    lines,
    schedule,
    warnings,
    claimedInputIds: [...claimedInputIds],
    totals: {
      employeeCount: payslips.length,
      grossTotal: sum((p) => p.grossPay),
      deductionTotal: sum((p) => p.totalEmployeeDeductions),
      netTotal: sum((p) => p.netPay),
      employerCostTotal: sum((p) => p.employerCost),
    },
    results,
  };
}
