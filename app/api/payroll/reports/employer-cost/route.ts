import { mockResponse } from "@/lib/mock-api";
import { addMonths } from "@/lib/payroll/periods";
import { defaultPeriodKey, loadReportSource, requireReportAccess } from "@/lib/payroll/report-server";

// GET /api/payroll/reports/employer-cost?periodKey=&groupBy=department|costCenter
// Employer cost (gross earnings + employer contributions) of a month by department / cost centre, plus a 12-month series.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const params = new URL(request.url).searchParams;
    const periodKey = params.get("periodKey") ?? (await defaultPeriodKey());
    const groupBy = params.get("groupBy") === "costCenter" ? "costCenter" : "department";
    const source = await loadReportSource(request, periodKey);

    const groups = new Map<string, { key: string; labelAr: string; labelEn: string; employees: number; gross: number; employerContribution: number; employerCost: number }>();
    for (const p of source.payslips) {
      const e = source.employees.find((x) => x.id === p.employeeId);
      const key = groupBy === "department" ? (e?.department ?? "—") : (p.costCenterId ?? "—");
      const g = groups.get(key) ?? { key, labelAr: key, labelEn: groupBy === "department" ? (e?.departmentEn ?? key) : key, employees: 0, gross: 0, employerContribution: 0, employerCost: 0 };
      g.employees += 1;
      g.gross += p.grossEarnings;
      g.employerContribution += p.employerContribution;
      g.employerCost += p.employerCost;
      groups.set(key, g);
    }

    const series = [];
    for (let i = -11; i <= 0; i++) {
      const key = addMonths(periodKey, i);
      const s = await loadReportSource(request, key);
      series.push({ periodKey: key, employerCost: s.payslips.reduce((t, p) => t + p.employerCost, 0), employees: s.payslips.length });
    }
    const rows = [...groups.values()].sort((a, b) => b.employerCost - a.employerCost);
    return {
      periodKey,
      isDraft: source.isDraft,
      groupBy,
      rows,
      totals: rows.reduce((t, r) => ({ employees: t.employees + r.employees, gross: t.gross + r.gross, employerContribution: t.employerContribution + r.employerContribution, employerCost: t.employerCost + r.employerCost }), { employees: 0, gross: 0, employerContribution: 0, employerCost: 0 }),
      series,
    };
  });
}
