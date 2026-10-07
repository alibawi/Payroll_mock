import type { PayrollAction } from "@/lib/payroll/permissions";
import type { FieldErrors, PayrollPeriod, PayrollRun, Payslip, RunScope, RunStatus, RunType } from "@/lib/payroll/types";

// Pure rules of the payroll cycle (spec-payroll-runs §3 and §5) shared by the Route Handlers and the screens.

export type RunAction = "calculate" | "recalculate" | "submit" | "approve" | "reject" | "post" | "pay" | "reverse" | "delete";

/** Which transitions each status offers (state machine of spec §3.1; gap G5: reject → Calculated, reverse only from Posted). */
export const RUN_ACTIONS: Record<RunStatus, RunAction[]> = {
  Draft: ["calculate", "delete"],
  Calculated: ["recalculate", "submit", "delete"],
  PendingApproval: ["approve", "reject"],
  Approved: ["post"],
  Posted: ["pay", "reverse"],
  Paid: [],
  Reversed: [],
};

/** The permission (on `payroll.run`) each transition needs (spec §7). */
export const RUN_ACTION_PERMISSION: Record<RunAction, PayrollAction> = {
  calculate: "calculate",
  recalculate: "calculate",
  submit: "update",
  approve: "approve",
  reject: "approve",
  post: "post",
  pay: "pay",
  reverse: "reverse",
  delete: "delete",
};

/** The status each transition leads to. */
export const RUN_NEXT_STATUS: Partial<Record<RunAction, RunStatus>> = {
  calculate: "Calculated",
  recalculate: "Calculated",
  submit: "PendingApproval",
  approve: "Approved",
  reject: "Calculated",
  post: "Posted",
  pay: "Paid",
  reverse: "Reversed",
};

/** Periods whose runs can still be (re)calculated. */
export const isEditableStatus = (status: RunStatus) => status === "Draft" || status === "Calculated";

export type RunDraft = {
  profileId: string;
  payrollPeriodId: string;
  runType: RunType;
  scopeFilter: RunScope;
  note?: string;
};

const sameScope = (a: RunScope, b: RunScope) => {
  const norm = (x: string[]) => [...x].sort().join("|");
  return norm(a.departments) === norm(b.departments) && norm(a.costCenters) === norm(b.costCenters) && norm(a.employeeIds) === norm(b.employeeIds);
};

/** R-1 (open period, one regular run per profile/period/scope) and the basic shape rules of a new run. */
export function validateRunDraft(
  draft: Partial<RunDraft>,
  period: PayrollPeriod | undefined,
  existing: PayrollRun[]
): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.profileId) errors.profileId = { rule: "R-0", message: { ar: "الملف مطلوب", en: "Profile is required" } };
  if (!draft.payrollPeriodId || !period) {
    errors.payrollPeriodId = { rule: "R-0", message: { ar: "الفترة مطلوبة", en: "Period is required" } };
    return errors;
  }
  if (period.profileId !== draft.profileId) {
    errors.payrollPeriodId = { rule: "R-0", message: { ar: "الفترة تخص ملفاً آخر", en: "The period belongs to another profile" } };
  } else if (period.status !== "Open") {
    errors.payrollPeriodId = {
      rule: "R-1",
      message: { ar: "لا دورة على فترة غير مفتوحة", en: "No run can be created on a period that is not open" },
    };
  }
  if (!draft.runType) errors.runType = { rule: "R-0", message: { ar: "نوع الدورة مطلوب", en: "Run type is required" } };
  if (draft.runType === "Regular" && !errors.payrollPeriodId) {
    const clash = existing.find(
      (r) =>
        r.runType === "Regular" &&
        r.payrollPeriodId === draft.payrollPeriodId &&
        r.status !== "Reversed" &&
        sameScope(r.scopeFilter, draft.scopeFilter ?? { departments: [], costCenters: [], employeeIds: [] })
    );
    if (clash) {
      errors.runType = {
        rule: "R-1",
        message: {
          ar: `توجد دورة عادية لنفس الملف والفترة والنطاق (${clash.runNo})`,
          en: `A regular run already exists for this profile, period and scope (${clash.runNo})`,
        },
      };
    }
  }
  if (draft.runType && draft.runType !== "Regular" && (draft.scopeFilter?.employeeIds.length ?? 0) === 0 && (draft.scopeFilter?.departments.length ?? 0) === 0 && (draft.scopeFilter?.costCenters.length ?? 0) === 0) {
    errors.scopeFilter = {
      rule: "R-0",
      message: { ar: "الدورة التكميلية تحتاج نطاقاً (موظفون أو أقسام أو مراكز كلفة)", en: "A supplementary run needs a scope (employees, departments or cost centres)" },
    };
  }
  return errors;
}

export const COMPARISON_THRESHOLD = 10;

export type ComparisonRow = {
  employeeId: string;
  currentNet: number | null;
  previousNet: number | null;
  diff: number;
  /** Percentage change of the net pay (null when one side is missing). */
  pct: number | null;
  kind: "new" | "left" | "changed" | "same";
  flagged: boolean;
};

export type Comparison = {
  previousRunId: string | null;
  previousRunNo: string | null;
  previousPeriodKey: string | null;
  totals: {
    key: "employeeCount" | "grossTotal" | "netTotal" | "employerCostTotal" | "deductionTotal";
    current: number;
    previous: number;
    diff: number;
    pct: number | null;
  }[];
  rows: ComparisonRow[];
};

/** R-5: difference of the totals and per-employee net pay against the previous run; > 10% net change is flagged. */
export function buildComparison(
  run: PayrollRun,
  payslips: Payslip[],
  previous: { run: PayrollRun; payslips: Payslip[] } | null
): Comparison {
  const pct = (cur: number, prev: number) => (prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10);
  const keys = ["employeeCount", "grossTotal", "deductionTotal", "netTotal", "employerCostTotal"] as const;
  const totals = keys.map((key) => {
    const current = run[key];
    const prev = previous?.run[key] ?? 0;
    return { key, current, previous: prev, diff: current - prev, pct: previous ? pct(current, prev) : null };
  });

  const prevByEmployee = new Map((previous?.payslips ?? []).map((p) => [p.employeeId, p]));
  const curByEmployee = new Map(payslips.map((p) => [p.employeeId, p]));
  const ids = new Set([...prevByEmployee.keys(), ...curByEmployee.keys()]);
  const rows: ComparisonRow[] = [...ids].map((employeeId) => {
    const cur = curByEmployee.get(employeeId);
    const prev = prevByEmployee.get(employeeId);
    const currentNet = cur?.netPay ?? null;
    const previousNet = prev?.netPay ?? null;
    const diff = (currentNet ?? 0) - (previousNet ?? 0);
    const change = currentNet !== null && previousNet !== null ? pct(currentNet, previousNet) : null;
    const kind: ComparisonRow["kind"] = !prev ? "new" : !cur ? "left" : diff === 0 ? "same" : "changed";
    return {
      employeeId,
      currentNet,
      previousNet,
      diff,
      pct: change,
      kind,
      flagged: previous !== null && (kind === "new" || kind === "left" || (change !== null && Math.abs(change) > COMPARISON_THRESHOLD)),
    };
  });
  rows.sort((a, b) => Number(b.flagged) - Number(a.flagged) || Math.abs(b.diff) - Math.abs(a.diff));

  return {
    previousRunId: previous?.run.id ?? null,
    previousRunNo: previous?.run.runNo ?? null,
    previousPeriodKey: previous?.run.periodKey ?? null,
    totals,
    rows,
  };
}
