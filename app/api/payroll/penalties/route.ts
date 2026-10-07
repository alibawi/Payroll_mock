import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { assertValid, readJson } from "@/lib/payroll/config-server";
import { DEPT_HEAD_DEPARTMENT, MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import { validatePenaltyDraft, type PenaltyDraft } from "@/lib/payroll/penalties";
import {
  appendPenaltyActivity,
  assertCanProposeFor,
  nextPenaltyNumber,
  PENALTY_FILES,
  penaltyRole,
  planPenalty,
  requirePenaltyPermission,
} from "@/lib/payroll/penalty-server";
import { collection, insertItem } from "@/lib/payroll/store";
import type { DisciplinaryPenalty, PenaltyInstallment } from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// Filters: ?status=Draft,Approved  ?type=FixedAmount  ?employeeId=emp-011  ?department=<name>
// The mock role scopes the list: employees see their own penalties, department heads their department.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const params = new URL(request.url).searchParams;
    const statuses = params.get("status")?.split(",").filter(Boolean);
    const type = params.get("type");
    const employeeId = params.get("employeeId");
    const department = params.get("department");
    const role = penaltyRole(request);

    const [penalties, installments, employees] = await Promise.all([
      collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
      collection<PenaltyInstallment>(PENALTY_FILES.installments),
      collection<Employee>(COMP_FILES.employees),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));

    return penalties
      .filter((p) => {
        const e = byId.get(p.employeeId);
        return (
          (!statuses || statuses.includes(p.status)) &&
          (!type || p.penaltyType === type) &&
          (!employeeId || p.employeeId === employeeId) &&
          (!department || e?.department === department || e?.departmentEn === department) &&
          (role !== "employee" || p.employeeId === MOCK_EMPLOYEE_ID) &&
          (role !== "deptHead" || e?.department === DEPT_HEAD_DEPARTMENT)
        );
      })
      .sort((a, b) => b.penaltyNo.localeCompare(a.penaltyNo))
      .map((penalty) => {
        const own = installments.filter((i) => i.penaltyId === penalty.id);
        return {
          ...penalty,
          employee: byId.get(penalty.employeeId) ?? null,
          installmentCount: own.length,
          deductedCount: own.filter((i) => i.status === "Deducted").length,
        };
      });
  });
}

// Creates a Draft. The amount is computed from the employee's pay (P-1) and the months are raised when needed (P-4/P-5);
// the instalment rows themselves are generated at approval.
export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requirePenaltyPermission(request, "create");
      const body = await readJson<Partial<PenaltyDraft> & { comments?: string }>(request);
      assertValid(validatePenaltyDraft(body));
      await assertCanProposeFor(request, body.employeeId!);

      const draft = body as PenaltyDraft;
      const { amount, plan, overBreachAction } = await planPenalty(draft);
      if (plan.blocked) {
        assertValid({
          spreadOverMonths: {
            rule: plan.minimalMonths === null ? "P-3" : "P-5",
            message:
              plan.minimalMonths === null
                ? { ar: "لا سعة استقطاع كافية ضمن السقف الشهري", en: "There is no room under the monthly deduction cap" }
                : { ar: `القسط يتجاوز السقف الشهري وسياسة الملف «${overBreachAction}» تمنع التدوير — زد الأشهر إلى ${plan.minimalMonths} على الأقل`, en: `The instalment exceeds the monthly cap and the profile policy (${overBreachAction}) forbids spreading — use at least ${plan.minimalMonths} months` },
          },
        });
      }

      const now = new Date().toISOString();
      const { n, penaltyNo } = await nextPenaltyNumber();
      const penalty: DisciplinaryPenalty = {
        id: `pen-${String(n).padStart(4, "0")}-${Date.now().toString(36)}`,
        penaltyNo,
        employeeId: draft.employeeId,
        penaltyType: draft.penaltyType,
        value: draft.penaltyType === "OneMonthSalary" ? null : Number(draft.value),
        computedAmount: amount,
        reason: draft.reason.trim(),
        decisionRef: draft.decisionRef.trim(),
        decisionDate: draft.decisionDate,
        issuedByUserId: penaltyRole(request) ?? "hrManager",
        spreadOverMonths: plan.months,
        startPeriodId: draft.startPeriodId,
        remainingAmount: amount,
        status: "Draft",
        approvedBy: null,
        approvedAt: null,
        comments: body.comments?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
      await insertItem(PENALTY_FILES.penalties, penalty);
      await appendPenaltyActivity(request, penalty.id, "Created", { ar: `إنشاء العقوبة — القرار ${penalty.decisionRef}`, en: `Penalty created — decision ${penalty.decisionRef}` });
      return { ...penalty, autoSpread: plan.autoSpread };
    },
    { status: 201 }
  );
}
