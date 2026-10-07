import { CONFIG_FILES, readJson } from "@/lib/payroll/config-server";
import { MockApiError, mockResponse } from "@/lib/mock-api";
import { loadReportSource, REPORT_FILES, requireReportAccess, sumLines } from "@/lib/payroll/report-server";
import { requirePermission, RUN_FILES } from "@/lib/payroll/run-server";
import { collection, insertItem, updateItem } from "@/lib/payroll/store";
import type {
  PayrollRun,
  RemittanceKind,
  RemittanceRecord,
  SocialSecurityConfiguration,
} from "@/lib/payroll/types";

const KINDS: RemittanceKind[] = ["tax", "pension", "socialSecurity"];
const CATEGORY = { tax: "IncomeTax", pension: "StatutoryPension", socialSecurity: "StatutorySocialSecurity" } as const;

// GET /api/payroll/reports/remittances?kind=tax|pension|socialSecurity[&periodKey=]
//  – without periodKey: one row per period (totals, status, T-2 check);
//  – with periodKey: the per-employee statement of that period.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const params = new URL(request.url).searchParams;
    const kind = (params.get("kind") ?? "tax") as RemittanceKind;
    if (!KINDS.includes(kind)) throw new MockApiError(400, `Unknown kind ${kind}`);
    const category = CATEGORY[kind];
    const [runs, statuses, ssConfigs] = await Promise.all([
      collection<PayrollRun>(RUN_FILES.runs),
      collection<RemittanceRecord>(REPORT_FILES.remittances),
      collection<SocialSecurityConfiguration>(CONFIG_FILES.socialSecurity),
    ]);
    const statusOf = (key: string) => statuses.find((s) => s.periodKey === key && s.kind === kind) ?? null;

    const detailKey = params.get("periodKey");
    if (detailKey) {
      const source = await loadReportSource(request, detailKey);
      const rows = source.payslips
        .map((p) => {
          const mine = source.lines.filter((l) => l.payslipId === p.id);
          const employeeShare = mine.filter((l) => l.category === category && l.componentType === "Deduction").reduce((s, l) => s + l.amount, 0);
          const employerShare = mine.filter((l) => l.category === category && l.componentType === "EmployerContribution").reduce((s, l) => s + l.amount, 0);
          const base = kind === "tax" ? p.taxableBase : kind === "pension" ? p.pensionableBase : p.socialSecurityBase;
          return { payslipId: p.id, employee: source.employees.find((e) => e.id === p.employeeId) ?? null, base, employeeShare, employerShare };
        })
        .filter((r) => r.employeeShare > 0 || r.employerShare > 0);
      const employeeTotal = rows.reduce((s, r) => s + r.employeeShare, 0);
      const employerTotal = rows.reduce((s, r) => s + r.employerShare, 0);
      // T-2: the statement total must equal the sum of the classified payslip lines
      const fromLines = sumLines(source.lines, (l) => l.category === category && l.componentType !== "Earning");
      const fromPayslips = kind === "tax" ? source.payslips.reduce((s, p) => s + p.incomeTax, 0) : employeeTotal + employerTotal;
      const ssConfig = ssConfigs.find((c) => c.effectiveFrom <= `${detailKey}-28` && (!c.effectiveTo || c.effectiveTo >= `${detailKey}-28`));
      return {
        kind,
        periodKey: detailKey,
        isDraft: source.isDraft,
        rows,
        employeeTotal,
        employerTotal,
        total: employeeTotal + employerTotal,
        consistent: fromLines === fromPayslips,
        status: statusOf(detailKey),
        establishmentFileNo: kind === "socialSecurity" ? (ssConfig?.establishmentFileNo ?? null) : null,
      };
    }

    const keys = [...new Set(runs.filter((r) => r.runType === "Regular" && r.status !== "Reversed" && r.status !== "Draft").map((r) => r.periodKey))].sort().reverse();
    const out = [];
    for (const key of keys) {
      const source = await loadReportSource(request, key);
      const employee = sumLines(source.lines, (l) => l.category === category && l.componentType === "Deduction");
      const employer = sumLines(source.lines, (l) => l.category === category && l.componentType === "EmployerContribution");
      if (employee + employer === 0) continue;
      out.push({
        periodKey: key,
        employeeTotal: employee,
        employerTotal: employer,
        total: employee + employer,
        employees: source.payslips.filter((p) => source.lines.some((l) => l.payslipId === p.id && l.category === category && l.amount > 0)).length,
        isDraft: source.isDraft,
        status: statusOf(key),
      });
    }
    return { kind, periods: out };
  });
}

// POST /api/payroll/reports/remittances { periodKey, kind } — marks a statement as remitted (Finance placeholder).
export async function POST(request: Request) {
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.report", "export");
    const body = await readJson<{ periodKey?: string; kind?: RemittanceKind }>(request);
    if (!body.periodKey || !body.kind || !KINDS.includes(body.kind)) throw new MockApiError(422, "periodKey and kind are required");
    const [statuses] = await Promise.all([collection<RemittanceRecord>(REPORT_FILES.remittances)]);
    const refs = statuses.map((s) => Number(s.voucherRef?.split("-")[2]) || 0);
    const voucherRef = `PV-REM-${String(Math.max(0, ...refs) + 1).padStart(4, "0")}`;
    const patch = { status: "Remitted" as const, remittedAt: new Date().toISOString(), voucherRef };
    const existing = statuses.find((s) => s.periodKey === body.periodKey && s.kind === body.kind);
    if (existing?.status === "Remitted") throw new MockApiError(409, "Already remitted");
    if (existing) return updateItem<RemittanceRecord>(REPORT_FILES.remittances, existing.id, patch);
    return insertItem<RemittanceRecord>(REPORT_FILES.remittances, { id: `rem-${body.periodKey}-${body.kind}`, periodKey: body.periodKey, kind: body.kind, ...patch });
  });
}
