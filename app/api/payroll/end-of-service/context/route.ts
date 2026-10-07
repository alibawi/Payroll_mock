import { mockResponse } from "@/lib/mock-api";
import { eosContext, eosFor } from "@/lib/payroll/eos-context";
import { loadEosData, requireEosPermission } from "@/lib/payroll/eos-server";
import type { TerminationReason } from "@/lib/payroll/types";

// GET /api/payroll/end-of-service/context?employeeId=&terminationDate=&reason=&leaveDays=&compensation=
// The live calculator of the form: service years, last wage, gratuity, leave pay and total (T-4…T-10).
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireEosPermission(request, "view");
    const p = new URL(request.url).searchParams;
    const employeeId = p.get("employeeId");
    const terminationDate = p.get("terminationDate");
    if (!employeeId || !terminationDate) return { ctx: null };
    const data = await loadEosData();
    const ctx = eosContext(data, employeeId, terminationDate);
    if (!ctx) return { ctx: null };
    const reason = (p.get("reason") ?? "Resignation") as TerminationReason;
    const leaveDays = p.get("leaveDays") === null ? ctx.defaultLeaveDays : Number(p.get("leaveDays"));
    const compensation = Number(p.get("compensation") ?? 0) || 0;
    return {
      ctx: { ...ctx, employee: undefined, employeeName: { ar: ctx.employee.fullNameAr, en: ctx.employee.fullNameEn }, joiningDate: ctx.employee.joiningDate },
      leaveDays,
      result: ctx.eligible ? eosFor(ctx, reason, leaveDays, compensation) : null,
    };
  });
}
