import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES, loadBundle, previewOf, recordsOf } from "@/lib/payroll/compensation-server";
import { LOAN_FILES } from "@/lib/payroll/loan-server";
import { PENALTY_FILES } from "@/lib/payroll/penalty-server";
import { CURRENT_PERIOD } from "@/lib/payroll/periods";
import { collection } from "@/lib/payroll/store";
import type {
  AttendanceSummary,
  DisciplinaryPenalty,
  EmployeeLoan,
  EmployeeLoanInstallment,
  PenaltyInstallment,
} from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// KPIs of the penalties list (spec §6).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const [penalties, rows, loans, loanRows, attendance, employees, bundle] = await Promise.all([
      collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
      collection<PenaltyInstallment>(PENALTY_FILES.installments),
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<EmployeeLoanInstallment>(LOAN_FILES.installments),
      collection<AttendanceSummary>(PENALTY_FILES.attendance),
      collection<Employee>(COMP_FILES.employees),
      loadBundle(),
    ]);

    const applying = penalties.filter((p) => p.status === "Applying" || p.status === "Approved");
    const dueRows = rows.filter((r) => r.duePeriodId === CURRENT_PERIOD);

    // Employees whose deductions due this month use more than 80% of their monthly cap.
    const dueByEmployee = new Map<string, number>();
    const add = (employeeId: string, amount: number) => dueByEmployee.set(employeeId, (dueByEmployee.get(employeeId) ?? 0) + amount);
    for (const r of dueRows.filter((x) => x.status === "Pending")) {
      const p = penalties.find((x) => x.id === r.penaltyId);
      if (p) add(p.employeeId, r.amount);
    }
    for (const r of loanRows.filter((x) => x.duePeriodId === CURRENT_PERIOD && x.status === "Pending")) {
      const l = loans.find((x) => x.id === r.loanId);
      if (l) add(l.employeeId, r.amount);
    }
    const nearCap = [];
    for (const [employeeId, total] of dueByEmployee) {
      const current = (await recordsOf(employeeId)).find((r) => r.status === "Current");
      if (!current) continue;
      const gross = previewOf(current, bundle).gross;
      const capPercent = bundle.profiles.find((p) => p.id === current.profileId)?.attendancePenaltyPolicy.maxMonthlyDeductionPercent ?? 25;
      const cap = (gross * capPercent) / 100;
      if (cap > 0 && total / cap > 0.8) nearCap.push({ employeeId, total, cap: Math.round(cap), ratio: Math.round((total / cap) * 100) });
    }

    // Attendance problems by department over the latest closed period of the HR summary.
    const latest = [...new Set(attendance.map((a) => a.periodId))].sort().at(-1);
    const byDept = new Map<string, { department: string; departmentEn: string; absenceDays: number; lateEvents: number }>();
    for (const a of attendance.filter((x) => x.periodId === latest)) {
      const e = employees.find((x) => x.id === a.employeeId);
      if (!e) continue;
      const entry = byDept.get(e.department) ?? { department: e.department, departmentEn: e.departmentEn, absenceDays: 0, lateEvents: 0 };
      entry.absenceDays += a.absenceDays;
      entry.lateEvents += a.lateEvents.length;
      byDept.set(e.department, entry);
    }

    return {
      period: CURRENT_PERIOD,
      pendingApproval: penalties.filter((p) => p.status === "Draft").length,
      applyingCount: applying.length,
      applyingRemaining: applying.reduce((s, p) => s + p.remainingAmount, 0),
      dueThisMonth: dueRows.reduce((s, r) => s + r.amount, 0),
      deductedThisMonth: dueRows.filter((r) => r.status === "Deducted").reduce((s, r) => s + r.amount, 0),
      nearCap,
      attendancePeriod: latest ?? null,
      topAttendanceDepartments: [...byDept.values()].sort((a, b) => b.absenceDays + b.lateEvents - (a.absenceDays + a.lateEvents)).slice(0, 3),
    };
  });
}
