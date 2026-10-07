import { assertValid, readJson } from "@/lib/payroll/config-server";
import { mockResponse } from "@/lib/mock-api";
import { validateEosDraft, type EosDraft } from "@/lib/payroll/eos";
import { eosContext, eosFor } from "@/lib/payroll/eos-context";
import { appendEosActivity, eosRole, loadEosData, nextEosNumber, requireEosPermission } from "@/lib/payroll/eos-server";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { collection, insertItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { EndOfServiceCalculation } from "@/lib/payroll/types";

// GET  /api/payroll/end-of-service  — all claims with their employee
// POST /api/payroll/end-of-service  — a new Draft claim; the amounts are calculated on the server (T-4…T-10)
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireEosPermission(request, "view");
    const [claims, data] = await Promise.all([collection<EndOfServiceCalculation>(REPORT_FILES.eos), loadEosData()]);
    return claims.map((c) => ({ ...c, employee: data.employees.find((e) => e.id === c.employeeId) as Employee | undefined ?? null }));
  });
}

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requireEosPermission(request, "create");
      const body = await readJson<Partial<EosDraft>>(request);
      const [claims, data] = await Promise.all([collection<EndOfServiceCalculation>(REPORT_FILES.eos), loadEosData()]);
      const errors = validateEosDraft(body, claims);
      const ctx = body.employeeId && body.terminationDate ? eosContext(data, body.employeeId, body.terminationDate) : null;
      if (body.employeeId && !ctx) errors.employeeId = { rule: "T-0", message: { ar: "الموظف غير موجود", en: "Employee not found" } };
      else if (ctx && !ctx.eligible) {
        errors.employeeId = { rule: "T-8", message: { ar: "مشمول بالتقاعد الموحّد — لا مكافأة نهاية خدمة", en: "Covered by the unified pension — no end-of-service gratuity" } };
      }
      assertValid(errors);

      const result = eosFor(ctx!, body.terminationReason!, body.accruedLeaveDays ?? ctx!.defaultLeaveDays, body.arbitraryDismissalCompensation ?? 0);
      const now = new Date().toISOString();
      const created: EndOfServiceCalculation = {
        id: `eos-${Date.now().toString(36)}`,
        eosNo: await nextEosNumber(),
        employeeId: body.employeeId!,
        terminationDate: body.terminationDate!,
        terminationReason: body.terminationReason!,
        serviceYears: ctx!.serviceYears,
        lastWage: ctx!.lastWage,
        gratuityAmount: result.gratuityAmount,
        accruedLeaveDays: body.accruedLeaveDays ?? ctx!.defaultLeaveDays,
        accruedLeavePay: result.accruedLeavePay,
        arbitraryDismissalCompensation: result.arbitraryDismissalCompensation,
        totalAmount: result.totalAmount,
        status: "Draft",
        journalRef: null,
        paymentRef: null,
        approvedBy: null,
        approvedAt: null,
        paidAt: null,
        notes: body.notes?.trim() || null,
        createdBy: eosRole(request) ?? "payrollOfficer",
        createdAt: now,
        updatedAt: now,
      };
      await insertItem(REPORT_FILES.eos, created);
      await appendEosActivity(request, created.id, "Created", { ar: `إنشاء مطالبة ${created.eosNo}`, en: `Claim ${created.eosNo} created` });
      return created;
    },
    { status: 201 }
  );
}
