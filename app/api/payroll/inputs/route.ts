import { COMP_FILES, loadBundle } from "@/lib/payroll/compensation-server";
import { assertValid, readJson } from "@/lib/payroll/config-server";
import { mockResponse } from "@/lib/mock-api";
import { compensationFor } from "@/lib/payroll/run-calc";
import { requirePermission, RUN_FILES, runRole } from "@/lib/payroll/run-server";
import { collection, insertItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { EmployeeCompensation, FieldErrors, PayrollInput, PayrollPeriod } from "@/lib/payroll/types";

/** Components a one-off input may use: manual earnings/deductions that no other source (loans, penalties) feeds. */
const INPUT_CATEGORIES = ["Bonus", "Other", "CourtOrder"];

// GET  /api/payroll/inputs?periodKey=&status=&employeeId=
// POST /api/payroll/inputs { periodKey, employeeId, componentId, amount, quantity?, reason, isRetroAdjustment? }
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.input", "view");
    const params = new URL(request.url).searchParams;
    const [inputs, employees, bundle] = await Promise.all([
      collection<PayrollInput>(RUN_FILES.inputs),
      collection<Employee>(COMP_FILES.employees),
      loadBundle(),
    ]);
    const componentOptions = bundle.components
      .filter((c) => c.isActive && INPUT_CATEGORIES.includes(c.category) && (c.componentType === "Earning" || c.componentType === "Deduction"))
      .map((c) => ({ id: c.id, code: c.code, name: c.name, componentType: c.componentType }));
    const rows = inputs
      .filter(
        (i) =>
          (!params.get("periodKey") || i.periodKey === params.get("periodKey")) &&
          (!params.get("status") || i.status === params.get("status")) &&
          (!params.get("employeeId") || i.employeeId === params.get("employeeId"))
      )
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey) || b.createdAt.localeCompare(a.createdAt))
      .map((i) => {
        const c = bundle.components.find((x) => x.id === i.componentId);
        return {
          ...i,
          employee: employees.find((e) => e.id === i.employeeId) ?? null,
          component: c ? { id: c.id, code: c.code, name: c.name, componentType: c.componentType } : null,
        };
      });
    return { rows, componentOptions };
  });
}

type Body = Partial<Pick<PayrollInput, "periodKey" | "employeeId" | "componentId" | "amount" | "quantity" | "reason" | "isRetroAdjustment">>;

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requirePermission(request, "payroll.input", "create");
      const body = await readJson<Body>(request);
      const [periods, compensations, bundle, inputs] = await Promise.all([
        collection<PayrollPeriod>(RUN_FILES.periods),
        collection<EmployeeCompensation>(COMP_FILES.compensations),
        loadBundle(),
        collection<PayrollInput>(RUN_FILES.inputs),
      ]);
      const errors: FieldErrors = {};
      const req = (key: string, ar: string, en: string) => (errors[key] = { rule: "I-1", message: { ar, en } });
      if (!body.periodKey) req("periodKey", "الفترة مطلوبة", "Period is required");
      if (!body.employeeId) req("employeeId", "الموظف مطلوب", "Employee is required");
      const component = bundle.components.find((c) => c.id === body.componentId);
      if (!component || !INPUT_CATEGORIES.includes(component.category)) {
        req("componentId", "البند مطلوب (مكافأة أو استقطاع يدوي)", "A manual earning or deduction component is required");
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) req("amount", "المبلغ يجب أن يكون أكبر من صفر", "Amount must be greater than zero");
      if (!body.reason?.trim()) req("reason", "السبب مطلوب", "Reason is required");
      assertValid(errors);

      // the period of the employee's profile must still be open (R-1) and the employee needs a compensation (R-2)
      const key = body.periodKey!;
      const monthStart = `${key}-01`;
      const monthEnd = `${key}-${String(new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5)), 0)).getUTCDate()).padStart(2, "0")}`;
      const comp = compensationFor(compensations, body.employeeId!, monthStart, monthEnd);
      if (!comp) assertValid({ employeeId: { rule: "R-2", message: { ar: "الموظف بلا تعويض نافذ بهذه الفترة", en: "The employee has no compensation in this period" } } });
      const period = periods.find((p) => p.periodKey === key && p.profileId === comp!.profileId);
      if (!period) {
        assertValid({ periodKey: { rule: "R-1", message: { ar: "لا توجد فترة رواتب بهذا الشهر لملف الموظف", en: "There is no payroll period for the employee's profile in this month" } } });
      }
      if (period!.status !== "Open") {
        assertValid({ periodKey: { rule: "R-1", message: { ar: "الفترة مقفلة — لا مدخلات جديدة", en: "The period is locked — no new inputs" } } });
      }

      const created: PayrollInput = {
        id: `in-${String(inputs.length + 1).padStart(4, "0")}-${Date.now().toString(36)}`,
        periodKey: key,
        employeeId: body.employeeId!,
        componentId: body.componentId!,
        amount,
        quantity: body.quantity ?? null,
        reason: body.reason!.trim(),
        isRetroAdjustment: Boolean(body.isRetroAdjustment),
        status: "Pending",
        appliedRunId: null,
        createdBy: runRole(request) ?? "payrollOfficer",
        createdAt: new Date().toISOString(),
      };
      return insertItem(RUN_FILES.inputs, created);
    },
    { status: 201 }
  );
}
