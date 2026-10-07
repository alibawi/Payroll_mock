import { computeEos, serviceYearsBetween, type EosResult } from "@/lib/payroll/eos";
import { computeCompensationPreview, type ConfigBundle } from "@/lib/payroll/preview";
import type { Employee } from "@/lib/types/hr";
import type {
  EmployeeCompensation,
  EmployeeCompensationComponent,
  LeaveBalance,
  TerminationReason,
} from "@/lib/payroll/types";

// Everything an end-of-service claim needs about an employee at a termination date, from plain data arrays
// (shared by the Route Handlers and the seed generator).

export type EosData = {
  bundle: ConfigBundle;
  employees: Employee[];
  compensations: EmployeeCompensation[];
  overrides: EmployeeCompensationComponent[];
  balances: LeaveBalance[];
};

export type EosContext = {
  employee: Employee;
  /** Private-sector only (T-8): government staff are covered by the unified pension. */
  eligible: boolean;
  profileId: string | null;
  lastWage: number;
  serviceYears: number;
  defaultLeaveDays: number;
  dayRateDivisor: number;
  roundingRule: number;
};

export function eosContext(data: EosData, employeeId: string, terminationDate: string): EosContext | null {
  const employee = data.employees.find((e) => e.id === employeeId);
  if (!employee) return null;
  const records = data.compensations
    .filter((c) => c.employeeId === employeeId && c.effectiveFrom <= terminationDate)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const comp = records[0];
  const profile = comp ? data.bundle.profiles.find((p) => p.id === comp.profileId) : undefined;
  const preview = comp
    ? computeCompensationPreview(
        {
          profileId: comp.profileId,
          salaryStructureId: comp.salaryStructureId,
          gradeStepId: comp.gradeStepId,
          baseSalary: comp.baseSalary,
          taxMaritalStatus: comp.taxMaritalStatus,
          eligibleChildrenCount: comp.eligibleChildrenCount,
          isPensionExempt: comp.isPensionExempt,
          overrides: data.overrides.filter((o) => o.compensationId === comp.id),
          date: terminationDate,
        },
        data.bundle
      )
    : null;
  return {
    employee,
    eligible: profile?.code === "PRIVATE_IQ",
    profileId: comp?.profileId ?? null,
    lastWage: preview?.gross ?? 0,
    serviceYears: serviceYearsBetween(employee.joiningDate, terminationDate),
    defaultLeaveDays: data.balances.find((b) => b.employeeId === employeeId)?.annualDays ?? 0,
    dayRateDivisor: profile?.dayRateBasis === "CalendarDays" ? 30 : 26,
    roundingRule: profile?.roundingRule ?? 250,
  };
}

export function eosFor(
  ctx: EosContext,
  reason: TerminationReason,
  accruedLeaveDays: number,
  arbitraryDismissalCompensation: number
): EosResult {
  return computeEos({
    serviceYears: ctx.serviceYears,
    lastWage: ctx.lastWage,
    terminationReason: reason,
    accruedLeaveDays,
    arbitraryDismissalCompensation,
    dayRateDivisor: ctx.dayRateDivisor,
    roundingRule: ctx.roundingRule,
  });
}
