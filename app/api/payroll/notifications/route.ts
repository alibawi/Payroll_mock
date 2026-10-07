import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { LOAN_FILES } from "@/lib/payroll/loan-server";
import { mockResponse } from "@/lib/mock-api";
import { MOCK_TODAY } from "@/lib/payroll/periods";
import { PENALTY_FILES } from "@/lib/payroll/penalty-server";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { RUN_FILES, runRole } from "@/lib/payroll/run-server";
import { collection } from "@/lib/payroll/store";
import type { Role } from "@/components/role-provider";
import type { Employee } from "@/lib/types/hr";
import type {
  DisciplinaryPenalty,
  EmployeeLoan,
  EndOfServiceCalculation,
  LocalizedText,
  PayrollInput,
  PayrollPeriod,
  PayrollRun,
  RemittanceRecord,
} from "@/lib/payroll/types";

export type Notification = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: LocalizedText;
  body: LocalizedText;
  href: string;
};

const DAY = 86_400_000;
const daysUntil = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${MOCK_TODAY}T00:00:00Z`)) / DAY);

// GET /api/payroll/notifications — what needs the current role's attention: runs awaiting a step, loans and penalties
// awaiting approval, deduction caps exceeded, periods close to their cut-off, remittances and claims outstanding.
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    const role = (runRole(request) ?? "payrollOfficer") as Role;
    const [runs, loans, penalties, periods, eos, remittances, inputs, employees] = await Promise.all([
      collection<PayrollRun>(RUN_FILES.runs),
      collection<EmployeeLoan>(LOAN_FILES.loans),
      collection<DisciplinaryPenalty>(PENALTY_FILES.penalties),
      collection<PayrollPeriod>(RUN_FILES.periods),
      collection<EndOfServiceCalculation>(REPORT_FILES.eos),
      collection<RemittanceRecord>(REPORT_FILES.remittances),
      collection<PayrollInput>(RUN_FILES.inputs),
      collection<Employee>(COMP_FILES.employees),
    ]);
    const out: Notification[] = [];
    const add = (roles: Role[], n: Notification) => roles.includes(role) && out.push(n);
    const name = (id: string) => employees.find((e) => e.id === id)?.fullNameEn ?? id;

    for (const r of runs) {
      const link = `/payroll/runs/${r.id}`;
      if (r.status === "PendingApproval") add(["hrManager"], { id: `run-${r.id}`, severity: "warning", href: link, title: { ar: "دورة بانتظار اعتمادك", en: "Run awaiting your approval" }, body: { ar: `${r.runNo} — ${r.employeeCount} قسيمة`, en: `${r.runNo} — ${r.employeeCount} payslips` } });
      if (r.status === "Calculated") add(["payrollOfficer"], { id: `run-${r.id}`, severity: "info", href: link, title: { ar: "دورة محتسبة جاهزة للإرسال", en: "Calculated run ready to submit" }, body: { ar: r.runNo, en: r.runNo } });
      if (r.status === "Approved") add(["financeAccountant"], { id: `run-${r.id}`, severity: "warning", href: link, title: { ar: "دورة معتمدة جاهزة للترحيل", en: "Approved run ready to post" }, body: { ar: r.runNo, en: r.runNo } });
      if (r.status === "Posted") add(["financeAccountant"], { id: `run-${r.id}`, severity: "info", href: link, title: { ar: "دورة مرحّلة بانتظار الدفع", en: "Posted run awaiting payment" }, body: { ar: r.runNo, en: r.runNo } });
      if (!["Draft", "Reversed", "Paid", "Posted", "Approved"].includes(r.status)) {
        const cap = r.warnings.filter((w) => w.code === "NET_PROTECTION_SPREAD" || w.code === "NET_PROTECTION_BLOCK");
        if (cap.length) add(["payrollOfficer", "hrManager"], { id: `cap-${r.id}`, severity: cap.some((w) => w.code === "NET_PROTECTION_BLOCK") ? "critical" : "warning", href: link, title: { ar: "سقف الاستقطاع الشهري مُتجاوز", en: "Monthly deduction cap exceeded" }, body: { ar: `${r.runNo} — ${cap.length} موظف`, en: `${r.runNo} — ${cap.length} employee(s)` } });
      }
    }
    for (const l of loans) {
      if (l.status === "PendingApproval") add(["hrManager"], { id: `loan-${l.id}`, severity: "warning", href: `/payroll/loans/${l.id}`, title: { ar: "طلب سلفة/قرض بانتظار الاعتماد", en: "Loan request awaiting approval" }, body: { ar: `${l.loanNo} — ${name(l.employeeId)}`, en: `${l.loanNo} — ${name(l.employeeId)}` } });
      if (l.status === "Approved") add(["financeAccountant"], { id: `loan-${l.id}`, severity: "info", href: `/payroll/loans/${l.id}`, title: { ar: "قرض معتمد جاهز للصرف", en: "Approved loan ready to disburse" }, body: { ar: `${l.loanNo} — ${name(l.employeeId)}`, en: `${l.loanNo} — ${name(l.employeeId)}` } });
    }
    for (const p of penalties) {
      if (p.status === "Draft") add(["hrManager"], { id: `pen-${p.id}`, severity: "info", href: `/payroll/penalties/${p.id}`, title: { ar: "عقوبة مقترحة بانتظار الاعتماد", en: "Proposed penalty awaiting approval" }, body: { ar: `${p.penaltyNo} — ${name(p.employeeId)}`, en: `${p.penaltyNo} — ${name(p.employeeId)}` } });
    }
    for (const p of periods) {
      const left = daysUntil(p.cutoffDate);
      const hasMain = runs.some((r) => r.payrollPeriodId === p.id && r.runType === "Regular" && !["Draft", "Reversed"].includes(r.status));
      if (p.status === "Open" && !hasMain && left >= 0 && left <= 21) {
        add(["payrollOfficer"], { id: `per-${p.id}`, severity: left <= 7 ? "critical" : "warning", href: "/payroll/periods", title: { ar: "فترة قريبة من تاريخ القطع", en: "Period close to its cut-off" }, body: { ar: `${p.periodKey} — بعد ${left} يوم`, en: `${p.periodKey} — in ${left} days` } });
      }
    }
    for (const e of eos) {
      if (e.status === "Draft") add(["hrManager"], { id: `eos-${e.id}`, severity: "info", href: `/payroll/end-of-service/${e.id}`, title: { ar: "مطالبة نهاية خدمة بانتظار الاعتماد", en: "End-of-service claim awaiting approval" }, body: { ar: `${e.eosNo} — ${name(e.employeeId)}`, en: `${e.eosNo} — ${name(e.employeeId)}` } });
      if (e.status === "Approved") add(["financeAccountant"], { id: `eos-${e.id}`, severity: "warning", href: `/payroll/end-of-service/${e.id}`, title: { ar: "مطالبة نهاية خدمة جاهزة للدفع", en: "End-of-service claim ready to pay" }, body: { ar: `${e.eosNo} — ${name(e.employeeId)}`, en: `${e.eosNo} — ${name(e.employeeId)}` } });
    }
    const due = remittances.filter((r) => r.status === "NotRemitted");
    if (due.length) add(["financeAccountant"], { id: "remittances", severity: "warning", href: "/payroll/remittances", title: { ar: "كشوف توريد غير مورَّدة", en: "Remittances outstanding" }, body: { ar: `${due.length} كشف`, en: `${due.length} statement(s)` } });
    const open = inputs.filter((i) => i.status === "Pending" && !i.appliedRunId);
    if (open.length) add(["payrollOfficer"], { id: "inputs", severity: "info", href: "/payroll/inputs", title: { ar: "مدخلات معلّقة لم يلتقطها احتساب", en: "Pending inputs not picked up yet" }, body: { ar: `${open.length} مدخل — أعد احتساب الدورة`, en: `${open.length} input(s) — recalculate the run` } });
    if (role === "employee") {
      const posted = runs.filter((r) => r.runType === "Regular" && ["Posted", "Paid"].includes(r.status)).sort((a, b) => b.periodKey.localeCompare(a.periodKey))[0];
      if (posted) out.push({ id: "my-payslip", severity: "info", href: "/payroll/my-payslips", title: { ar: "قسيمة راتب جديدة", en: "New payslip" }, body: { ar: `قسيمة ${posted.periodKey}`, en: `Payslip ${posted.periodKey}` } });
    }
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return { items: out.sort((a, b) => order[a.severity] - order[b.severity]), count: out.length };
  });
}
