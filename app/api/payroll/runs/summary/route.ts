import { mockResponse } from "@/lib/mock-api";
import { addMonths, CURRENT_PERIOD } from "@/lib/payroll/periods";
import { requirePermission, RUN_FILES } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { ComponentCategory, PayrollInput, PayrollRun, Payslip, PayslipLineRecord } from "@/lib/payroll/types";

// GET /api/payroll/runs/summary — KPIs of the module dashboard (spec §8): current-month totals vs the previous month,
// six-month cost trend, deduction mix, runs waiting for an action, employees under net protection, pending inputs.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.run", "view");
    const [runs, payslips, lines, inputs] = await Promise.all([
      collection<PayrollRun>(RUN_FILES.runs),
      collection<Payslip>(RUN_FILES.payslips),
      collection<PayslipLineRecord>(RUN_FILES.lines),
      collection<PayrollInput>(RUN_FILES.inputs),
    ]);

    // runs that count: regular, past the Draft stage, not reversed
    const counted = runs.filter((r) => r.runType === "Regular" && r.status !== "Draft" && r.status !== "Reversed");
    const totalsOf = (key: string) => {
      const mine = counted.filter((r) => r.periodKey === key);
      const sum = (pick: (r: PayrollRun) => number) => mine.reduce((s, r) => s + pick(r), 0);
      return {
        periodKey: key,
        gross: sum((r) => r.grossTotal),
        net: sum((r) => r.netTotal),
        deductions: sum((r) => r.deductionTotal),
        employerCost: sum((r) => r.employerCostTotal),
        employees: sum((r) => r.employeeCount),
        runs: mine.length,
      };
    };

    const current = totalsOf(CURRENT_PERIOD);
    const previous = totalsOf(addMonths(CURRENT_PERIOD, -1));
    const trend = Array.from({ length: 6 }, (_, i) => totalsOf(addMonths(CURRENT_PERIOD, i - 5)));

    // deduction mix of the current month's payslips
    const currentRunIds = new Set(counted.filter((r) => r.periodKey === CURRENT_PERIOD).map((r) => r.id));
    const currentPayslips = payslips.filter((p) => currentRunIds.has(p.runId));
    const payslipIds = new Set(currentPayslips.map((p) => p.id));
    const mix: Record<string, number> = { tax: 0, socialSecurity: 0, pension: 0, loans: 0, penalties: 0, other: 0 };
    const bucket: Partial<Record<ComponentCategory, keyof typeof mix>> = {
      IncomeTax: "tax",
      StatutorySocialSecurity: "socialSecurity",
      StatutoryPension: "pension",
      LoanRepayment: "loans",
      DisciplinaryPenalty: "penalties",
    };
    for (const l of lines) {
      if (!payslipIds.has(l.payslipId) || l.componentType !== "Deduction" || l.source === "Attendance") continue;
      mix[bucket[l.category] ?? "other"] += l.amount;
    }

    const open = runs.filter((r) => ["Calculated", "PendingApproval", "Approved"].includes(r.status));
    return {
      period: CURRENT_PERIOD,
      current,
      previous,
      trend,
      deductionMix: mix,
      waiting: {
        total: open.length,
        calculated: open.filter((r) => r.status === "Calculated").length,
        pendingApproval: open.filter((r) => r.status === "PendingApproval").length,
        approved: open.filter((r) => r.status === "Approved").length,
      },
      netProtection: currentPayslips.filter((p) => p.netProtectionFlag).length,
      pendingInputs: inputs.filter((i) => i.status === "Pending" && i.periodKey === CURRENT_PERIOD).length,
    };
  });
}
