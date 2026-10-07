import { MockApiError, mockResponse } from "@/lib/mock-api";
import { absenceDeduction, dayRate, latenessDeduction } from "@/lib/payroll/attendance";
import { COMP_FILES, loadBundle, previewOf, recordsOf } from "@/lib/payroll/compensation-server";
import { monthlyCapacity } from "@/lib/payroll/netProtection";
import { PENALTY_FILES, othersByPeriod } from "@/lib/payroll/penalty-server";
import { collection } from "@/lib/payroll/store";
import type { AttendanceSummary } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// Attendance policy simulator (spec §8 screen 5): GET ?employeeId=emp-011&period=2026-09
// Runs the same pure functions the payroll engine will use and returns every intermediate number.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const employeeId = params.get("employeeId");
    const period = params.get("period");
    if (!employeeId || !period) throw new MockApiError(400, "employeeId and period are required");

    const [employees, attendance, bundle, records] = await Promise.all([
      collection<Employee>(COMP_FILES.employees),
      collection<AttendanceSummary>(PENALTY_FILES.attendance),
      loadBundle(),
      recordsOf(employeeId),
    ]);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) throw new MockApiError(404, `Employee ${employeeId} not found`);
    const summary = attendance.find((a) => a.employeeId === employeeId && a.periodId === period);
    if (!summary) throw new MockApiError(404, `No attendance summary for ${employeeId} in ${period}`);
    // The compensation current at the end of the period (so closed months stay reproducible).
    const periodEnd = `${period}-28`;
    const current = records.find((r) => r.effectiveFrom <= periodEnd && (!r.effectiveTo || r.effectiveTo >= periodEnd));
    if (!current) throw new MockApiError(404, "The employee had no compensation in this period");

    const preview = previewOf(current, bundle);
    const profile = bundle.profiles.find((p) => p.id === current.profileId)!;
    const policy = profile.attendancePenaltyPolicy;
    const basisLines = preview.lines.filter((l) => l.componentType === "Earning" && policy.absenceDayRateComponentCodes.includes(l.componentCode));
    const basis = basisLines.reduce((s, l) => s + l.amount, 0);
    const rate = dayRate(basis, profile, summary);
    const absence = absenceDeduction(rate, summary.absenceDays);
    const lateness = latenessDeduction(policy, summary.lateEvents, rate);
    const grossAfter = preview.gross - absence - lateness.total;
    const others = await othersByPeriod(employeeId);
    const cap = monthlyCapacity(grossAfter, policy.maxMonthlyDeductionPercent, 0);

    return {
      employee,
      summary,
      profile: { code: profile.code, name: profile.name, dayRateBasis: profile.dayRateBasis },
      policy,
      basis,
      basisComponents: basisLines.map((l) => ({ code: l.componentCode, name: l.componentName, amount: l.amount })),
      dayRate: rate,
      absence: { days: summary.absenceDays, amount: absence },
      lateness,
      grossBefore: preview.gross,
      grossAfter,
      cap: { percent: policy.maxMonthlyDeductionPercent, amount: cap, othersDue: others[period] ?? 0 },
    };
  });
}
