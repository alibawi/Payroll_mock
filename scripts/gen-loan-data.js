// One-off generator for module 3 seed data (loans, instalments, activity log).
// Depends on scripts/gen-config-data.js + gen-compensation-data.js. Run: node scripts/gen-loan-data.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "mock-data", "payroll") + path.sep;
const write = (f, d) => fs.writeFileSync(dir + f, JSON.stringify(d, null, 2) + "\n");
const employees = Object.fromEntries(
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mock-data", "hr", "employees.json"), "utf-8")).map((e) => [e.id, e])
);
const L = (ar, en) => ({ ar, en });

const CURRENT = "2026-10";
const addMonths = (p, n) => {
  const [y, m] = p.split("-").map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
};
const periodEnd = (p) => {
  const [y, m] = p.split("-").map(Number);
  return `${p}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};

const actors = {
  hr: { name: L("سلمى الكربولي", "Salma Al-Karbouli"), role: "hrManager" },
  po: { name: L("هبة الجبوري", "Hiba Al-Jubouri"), role: "payrollOfficer" },
  fa: { name: L("محمد العبيدي", "Mohammed Al-Obaidi"), role: "financeAccountant" },
};

const loans = [];
const installments = [];
const log = [];
let jv = 0;

function schedule(o) {
  const interest = o.type === "PersonalLoan" && o.interest ? Math.round((o.principal * o.interest) / 100) : 0;
  const total = o.principal + interest;
  const count = o.type === "SalaryAdvance" ? 1 : o.count;
  const base = count === 1 ? total : Math.floor(total / count / 250) * 250;
  const rows = Array.from({ length: count }, (_, i) => {
    const due = addMonths(o.first, i);
    return { seqNo: i + 1, duePeriodId: due, dueDate: periodEnd(due), amount: i === count - 1 ? total - base * (count - 1) : base };
  });
  return { total, count, base, rows };
}

/**
 * o: { n, emp, type, principal, interest?, count?, first, date, status, reason, deducted?, deferSeq?, rejected?, guarantor? }
 * `deducted` = number of instalments already taken from payroll (status Deducted).
 */
function add(o) {
  const id = `ln-${String(o.n).padStart(4, "0")}`;
  const loanNo = `LN-2026-${String(o.n).padStart(4, "0")}`;
  const s = schedule(o);
  const hasSchedule = ["Approved", "Disbursed", "Active", "Settled"].includes(o.status);
  const disbursed = ["Disbursed", "Active", "Settled"].includes(o.status);
  const deducted = o.deducted ?? (o.status === "Settled" ? s.count : 0);
  const rows = hasSchedule ? s.rows.map((r) => ({ ...r })) : [];

  rows.forEach((r, i) => {
    r.id = `${id}-i${r.seqNo}`;
    r.loanId = id;
    r.deductedAmount = 0;
    r.status = "Pending";
    r.deferredFromSeqNo = null;
    r.settlementSource = null;
    r.payslipId = null;
    r.deductedOn = null;
    if (i < deducted) {
      r.status = "Deducted";
      r.deductedAmount = r.amount;
      r.payslipId = `ps-${r.duePeriodId}-${o.emp}`;
      r.deductedOn = r.dueDate;
    }
  });
  if (o.deferSeq) {
    const r = rows.find((x) => x.seqNo === o.deferSeq);
    r.status = "Deferred";
    const last = rows[rows.length - 1];
    const dueP = addMonths(last.duePeriodId, 1);
    rows.push({ id: `${id}-i${rows.length + 1}`, loanId: id, seqNo: rows.length + 1, duePeriodId: dueP, dueDate: periodEnd(dueP), amount: r.amount, deductedAmount: 0, status: "Pending", deferredFromSeqNo: o.deferSeq, settlementSource: null, payslipId: null, deductedOn: null });
  }
  const paid = rows.filter((r) => r.status === "Deducted").reduce((a, r) => a + r.deductedAmount, 0);
  const outstanding = disbursed ? s.total - paid : hasSchedule ? s.total : s.total;
  const cc = employees[o.emp].costCenter;
  const journalRef = disbursed ? `JV-EMPLOAN-${String(++jv).padStart(4, "0")}` : null;

  loans.push({
    id, loanNo, employeeId: o.emp, loanType: o.type, loanDate: o.date, principal: o.principal, currencyCode: "IQD",
    interestType: o.interest ? "Flat" : "None", interestRate: o.interest ?? null, totalRepayable: s.total,
    repaymentMethod: o.type === "SalaryAdvance" ? "FullNextPayroll" : "Installments",
    installmentCount: s.count, installmentAmount: s.base, firstDeductionPeriodId: o.first,
    outstandingBalance: o.status === "Cancelled" ? 0 : outstanding, status: o.status,
    approvedBy: hasSchedule ? "hrManager" : null, approvedAt: hasSchedule ? o.date + "T11:00:00Z" : null,
    rejectedBy: o.rejected ? "hrManager" : null, rejectedAt: o.rejected ? o.date + "T15:00:00Z" : null, rejectionReason: o.rejected ?? null,
    guarantorEmployeeId: o.guarantor ?? null, reason: o.reason, costCenterId: cc, comments: o.comments ?? null,
    loanReceivableAccountCode: "1150", disbursementAccountCode: o.cash ? "1110" : "1120",
    journalEntryId: disbursed ? `je-${journalRef}` : null, journalRef,
    createdBy: "payrollOfficer", createdAt: o.date + "T09:00:00Z", updatedAt: (o.updated ?? o.date) + "T09:00:00Z",
  });
  installments.push(...rows);

  const ev = (action, actor, at, ar, en) =>
    log.push({ id: `la-${String(log.length + 1).padStart(3, "0")}`, loanId: id, action, actor: actors[actor], timestamp: at + "T09:00:00Z", summary: L(ar, en) });
  ev("Created", "po", o.date, "إنشاء الطلب", "Request created");
  if (o.status !== "Draft" || o.rejected) ev("Submitted", "po", o.date, "إرسال للاعتماد", "Submitted for approval");
  if (o.rejected) ev("Rejected", "hr", o.date, `رفض الطلب: ${o.rejected}`, `Rejected: ${o.rejected}`);
  if (hasSchedule) ev("Approved", "hr", o.date, "اعتماد الطلب وتوليد جدول الأقساط", "Approved; instalment schedule generated");
  if (disbursed) ev("Disbursed", "fa", o.date, `صرف المبلغ — القيد ${journalRef}`, `Disbursed — journal ${journalRef}`);
  rows.filter((r) => r.status === "Deducted").forEach((r) =>
    log.push({ id: `la-${String(log.length + 1).padStart(3, "0")}`, loanId: id, action: "Deducted", actor: actors.po, timestamp: r.dueDate + "T18:00:00Z", summary: L(`استقطاع القسط ${r.seqNo} من راتب ${r.duePeriodId}`, `Instalment ${r.seqNo} deducted from ${r.duePeriodId} payroll`) })
  );
  if (o.deferSeq) ev("Deferred", "hr", o.updated ?? o.date, `تأجيل القسط ${o.deferSeq} إلى نهاية الجدول`, `Instalment ${o.deferSeq} deferred to the end of the schedule`);
  if (o.status === "Settled") ev("Settled", "po", rows[rows.length - 1].dueDate, "سُدّد القرض بالكامل", "Loan fully repaid");
  if (o.status === "Cancelled") ev("Cancelled", "hr", o.date, "إلغاء الطلب", "Request cancelled");
}

// Study 12.1: housing loan, 100,000 per instalment (emp-007)
add({ n: 1, emp: "emp-007", type: "PersonalLoan", principal: 3000000, count: 30, first: "2026-03", date: "2026-02-10", status: "Active", deducted: 7, reason: "قرض إسكان", comments: "كفالة الراتب — مرفق عقد الشراء", guarantor: "emp-001" });
// Study 12.2: employee loan, 150,000 per instalment (emp-008)
add({ n: 2, emp: "emp-008", type: "PersonalLoan", principal: 1800000, count: 12, first: "2026-05", date: "2026-04-14", status: "Active", deducted: 5, reason: "ظروف عائلية طارئة" });
// Salary advance disbursed, to be taken from the October payroll
add({ n: 3, emp: "emp-015", type: "SalaryAdvance", principal: 300000, first: CURRENT, date: "2026-09-25", status: "Disbursed", reason: "سلفة على الراتب", cash: true });
// Fully repaid
add({ n: 4, emp: "emp-015", type: "PersonalLoan", principal: 1200000, count: 6, first: "2026-01", date: "2025-12-18", status: "Settled", reason: "شراء مركبة" });
// Cancelled request
add({ n: 5, emp: "emp-005", type: "PersonalLoan", principal: 600000, count: 6, first: "2026-11", date: "2026-09-02", status: "Cancelled", reason: "تجديد أثاث" });
// Waiting for approval
add({ n: 6, emp: "emp-013", type: "PersonalLoan", principal: 900000, count: 6, first: "2026-11", date: "2026-10-05", status: "PendingApproval", reason: "تكاليف علاج" });
// Approved, ready to disburse
add({ n: 7, emp: "emp-006", type: "PersonalLoan", principal: 2000000, count: 10, first: "2026-11", date: "2026-10-03", status: "Approved", reason: "ترميم منزل" });
// Active with a deferred instalment
add({ n: 8, emp: "emp-012", type: "PersonalLoan", principal: 1500000, count: 10, first: "2026-04", date: "2026-03-20", status: "Active", deducted: 5, deferSeq: 6, updated: "2026-09-05", reason: "قرض شخصي" });
// Draft
add({ n: 9, emp: "emp-002", type: "PersonalLoan", principal: 500000, count: 3, first: "2026-11", date: "2026-10-06", status: "Draft", reason: "رسوم دراسية" });
// Settled advance
add({ n: 10, emp: "emp-003", type: "SalaryAdvance", principal: 500000, first: "2026-09", date: "2026-08-28", status: "Settled", reason: "سلفة على الراتب" });
// Loan with flat interest
add({ n: 11, emp: "emp-009", type: "PersonalLoan", principal: 800000, interest: 5, count: 8, first: "2026-06", date: "2026-05-12", status: "Active", deducted: 4, reason: "قرض شخصي بفائدة" });
// Rejected (back to draft with a reason)
add({ n: 12, emp: "emp-010", type: "PersonalLoan", principal: 1000000, count: 4, first: "2026-11", date: "2026-09-20", status: "Draft", rejected: "القسط يتجاوز سقف الاستقطاع الشهري", reason: "قرض شخصي" });

log.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
write("loans.json", loans);
write("loan-installments.json", installments);
write("loan-activity-log.json", log);
console.log("loans:", loans.length, "installments:", installments.length, "log:", log.length);
