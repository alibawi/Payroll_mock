import { mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import { capContext } from "@/lib/payroll/loan-server";
import { buildSchedule, type LoanDraftInput } from "@/lib/payroll/loans";
import { CURRENT_PERIOD } from "@/lib/payroll/periods";

// Live schedule + monthly-cap warning (L-2, L-3, L-13) for the request form. Writes nothing.
export async function POST(request: Request) {
  return mockResponse(request, async () => {
    const body = await readJson<Partial<LoanDraftInput>>(request);
    const schedule = buildSchedule({
      loanType: body.loanType ?? "PersonalLoan",
      principal: Number(body.principal) || 0,
      interestType: body.interestType ?? "None",
      interestRate: body.interestRate ?? null,
      installmentCount: Number(body.installmentCount) || 1,
      firstDeductionPeriodId: body.firstDeductionPeriodId || CURRENT_PERIOD,
    });
    const cap = body.employeeId
      ? await capContext(body.employeeId, schedule.installmentAmount, schedule.rows[0]?.duePeriodId ?? CURRENT_PERIOD)
      : null;
    return { schedule, cap };
  });
}
