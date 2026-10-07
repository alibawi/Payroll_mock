import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { CONFIG_FILES } from "@/lib/payroll/config-server";
import { LOAN_FILES } from "@/lib/payroll/loan-server";
import { mockResponse } from "@/lib/mock-api";
import { PENALTY_FILES } from "@/lib/payroll/penalty-server";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { RUN_FILES, runRole } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type { DisciplinaryPenalty, EmployeeLoan, EndOfServiceCalculation, LocalizedText, PayrollComponent, PayrollRun } from "@/lib/payroll/types";

export type SearchHit = { id: string; group: "employee" | "run" | "loan" | "penalty" | "component" | "eos"; title: LocalizedText; subtitle: string; href: string };

// GET /api/payroll/search?q= — the topbar's cross-module search: employees, runs, loans, penalties, components and
// end-of-service claims, each limited to 5 hits. Employees only find their own records.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
    if (q.length < 2) return { hits: [] as SearchHit[] };
    const role = runRole(request);
    if (role === "employee") return { hits: [] as SearchHit[] };
    const has = (...parts: (string | undefined | null)[]) => parts.some((p) => p?.toLowerCase().includes(q));

    const [employees, runs, loans, penalties, components, eos] = await Promise.all([
      collection<Employee>(COMP_FILES.employees),
      collection<PayrollRun>(RUN_FILES.runs),
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
      collection<PayrollComponent>(CONFIG_FILES.components),
      collection<EndOfServiceCalculation>(REPORT_FILES.eos),
    ]);
    const emp = (id: string) => employees.find((e) => e.id === id);
    const nameOf = (id: string) => emp(id)?.fullNameEn ?? id;
    const hits: SearchHit[] = [];
    const push = (hit: SearchHit, count: number) => count < 5 && hits.push(hit);

    let n = 0;
    for (const e of employees) if (has(e.fullNameAr, e.fullNameEn, e.employeeCode) && push({ id: e.id, group: "employee", title: { ar: e.fullNameAr, en: e.fullNameEn }, subtitle: `${e.employeeCode} · ${e.positionEn}`, href: `/payroll/compensations/${e.id}` }, n)) n++;
    n = 0;
    for (const r of runs) if (has(r.runNo, r.periodKey) && push({ id: r.id, group: "run", title: { ar: r.runNo, en: r.runNo }, subtitle: `${r.periodKey} · ${r.status}`, href: `/payroll/runs/${r.id}` }, n)) n++;
    n = 0;
    for (const l of loans) if (has(l.loanNo, nameOf(l.employeeId), emp(l.employeeId)?.fullNameAr) && push({ id: l.id, group: "loan", title: { ar: l.loanNo, en: l.loanNo }, subtitle: `${nameOf(l.employeeId)} · ${l.status}`, href: `/payroll/loans/${l.id}` }, n)) n++;
    n = 0;
    for (const p of penalties) if (has(p.penaltyNo, p.decisionRef, nameOf(p.employeeId), emp(p.employeeId)?.fullNameAr) && push({ id: p.id, group: "penalty", title: { ar: p.penaltyNo, en: p.penaltyNo }, subtitle: `${nameOf(p.employeeId)} · ${p.status}`, href: `/payroll/penalties/${p.id}` }, n)) n++;
    n = 0;
    for (const c of components) if (has(c.code, c.name.ar, c.name.en) && push({ id: c.id, group: "component", title: c.name, subtitle: c.code, href: `/payroll/config/components/${c.id}` }, n)) n++;
    n = 0;
    for (const e of eos) if (has(e.eosNo, nameOf(e.employeeId), emp(e.employeeId)?.fullNameAr) && push({ id: e.id, group: "eos", title: { ar: e.eosNo, en: e.eosNo }, subtitle: `${nameOf(e.employeeId)} · ${e.status}`, href: `/payroll/end-of-service/${e.id}` }, n)) n++;
    return { hits };
  });
}
