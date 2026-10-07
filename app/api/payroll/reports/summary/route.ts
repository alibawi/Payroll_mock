import { mockResponse } from "@/lib/mock-api";
import { defaultPeriodKey, loadReportSource, REPORT_FILES, requireReportAccess, sumLines } from "@/lib/payroll/report-server";
import { collection } from "@/lib/payroll/store";
import type { EndOfServiceCalculation, RemittanceRecord } from "@/lib/payroll/types";

// GET /api/payroll/reports/summary — KPIs of the reports hub (spec §6) for the latest posted period.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requireReportAccess(request);
    const periodKey = await defaultPeriodKey();
    const [source, eos, remittances] = await Promise.all([
      loadReportSource(request, periodKey),
      collection<EndOfServiceCalculation>(REPORT_FILES.eos),
      collection<RemittanceRecord>(REPORT_FILES.remittances),
    ]);
    const cat = (c: string, type: "Deduction" | "EmployerContribution") => sumLines(source.lines, (l) => l.category === c && l.componentType === type);
    const bank = source.payslips.filter((p) => p.paymentMethod === "Bank" && p.netPay > 0);
    const open = eos.filter((e) => e.status === "Draft" || e.status === "Approved");
    const outstanding = remittances.filter((r) => r.status === "NotRemitted");
    // amount still owed to the authorities: every statement of a posted period not yet remitted
    const CAT = { tax: "IncomeTax", pension: "StatutoryPension", socialSecurity: "StatutorySocialSecurity" } as const;
    let outstandingAmount = 0;
    for (const r of outstanding.filter((x) => x.periodKey <= periodKey)) {
      const src = await loadReportSource(request, r.periodKey);
      outstandingAmount += sumLines(src.lines, (l) => l.category === CAT[r.kind] && l.componentType !== "Earning");
    }
    return {
      periodKey,
      outstandingAmount,
      tax: cat("IncomeTax", "Deduction"),
      pension: { employee: cat("StatutoryPension", "Deduction"), employer: cat("StatutoryPension", "EmployerContribution") },
      socialSecurity: { employee: cat("StatutorySocialSecurity", "Deduction"), employer: cat("StatutorySocialSecurity", "EmployerContribution") },
      bank: { count: bank.length, total: bank.reduce((s, p) => s + p.netPay, 0) },
      eosPending: { count: open.length, amount: open.reduce((s, e) => s + e.totalAmount, 0) },
      employerCost: source.payslips.reduce((s, p) => s + p.employerCost, 0),
      outstandingRemittances: outstanding.length,
    };
  });
}
