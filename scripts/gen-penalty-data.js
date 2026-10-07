// One-off generator for module 4 seed data: HR attendance summary, penalties, instalments, activity log.
// Run after gen-config-data / gen-compensation-data / gen-loan-data: node scripts/gen-penalty-data.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "mock-data") + path.sep;
const write = (f, d) => fs.writeFileSync(root + f, JSON.stringify(d, null, 2) + "\n");
const employees = JSON.parse(fs.readFileSync(root + "hr/employees.json", "utf-8"));
const L = (ar, en) => ({ ar, en });

const addMonths = (p, n) => {
  const [y, m] = p.split("-").map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
};
const periodEnd = (p) => {
  const [y, m] = p.split("-").map(Number);
  return `${p}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};

// ---- HR attendance summary (one row per employee × period) ----
const periods = ["2026-08", "2026-09"];
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const summary = [];
for (const e of employees) {
  if (e.status === "archived") continue;
  for (const periodId of periods) {
    const start = e.joiningDate.slice(0, 7);
    const end = e.terminationDate ? e.terminationDate.slice(0, 7) : null;
    if (periodId < start || (end && periodId > end)) continue;
    const h = hash(e.id + periodId);
    // New hires only worked part of their first month.
    const partial = periodId === start && e.joiningDate > periodId + "-01";
    const workingDays = partial ? Math.max(1, 26 - Math.round((Number(e.joiningDate.slice(8)) / 31) * 26)) : 26;
    const lateCount = h % 7 === 0 ? 2 : h % 5 === 0 ? 1 : 0;
    const lateEvents = Array.from({ length: lateCount }, (_, i) => 8 + ((h >> (i + 2)) % 30));
    summary.push({
      id: `as-${e.id.slice(4)}-${periodId}`,
      employeeId: e.id,
      periodId,
      workingDays,
      calendarDays: 30,
      absenceDays: h % 11 === 0 ? 1 : 0,
      lateEvents,
      lwpDays: e.id === "emp-009" ? 26 : e.id === "emp-017" && periodId === "2026-09" ? 10 : 0,
      overtimeHours: h % 4 === 0 ? (h % 9) + 2 : 0,
    });
  }
}
// Study example 12.4 — base wage 900,000 over 26 working days: 2 unexcused absences, 3 late arrivals of 16–30 min.
const golden = summary.find((s) => s.employeeId === "emp-011" && s.periodId === "2026-09");
Object.assign(golden, { workingDays: 26, absenceDays: 2, lateEvents: [20, 25, 18], lwpDays: 0, overtimeHours: 0 });
write("hr/attendance-summary.json", summary);

// ---- Penalties ----
const actors = {
  hr: { name: L("سلمى الكربولي", "Salma Al-Karbouli"), role: "hrManager" },
  po: { name: L("هبة الجبوري", "Hiba Al-Jubouri"), role: "payrollOfficer" },
};
const penalties = [];
const installments = [];
const log = [];

/** p: { n, emp, type, value, amount, reason, ref, date, status, start, amounts[], deducted, issuedBy } */
function add(p) {
  const id = `pen-${String(p.n).padStart(4, "0")}`;
  const penaltyNo = `PEN-2026-${String(p.n).padStart(4, "0")}`;
  const hasSchedule = ["Approved", "Applying", "Applied"].includes(p.status);
  const rows = hasSchedule
    ? p.amounts.map((amount, i) => {
        const due = addMonths(p.start, i);
        const done = i < (p.deducted ?? 0);
        return { id: `${id}-i${i + 1}`, penaltyId: id, seqNo: i + 1, duePeriodId: due, amount, deductedAmount: done ? amount : 0, status: done ? "Deducted" : "Pending", payslipId: done ? `ps-${due}-${p.emp}` : null };
      })
    : [];
  const remaining = p.status === "Cancelled" ? 0 : hasSchedule ? rows.filter((r) => r.status === "Pending").reduce((a, r) => a + r.amount, 0) : p.amount;
  penalties.push({
    id, penaltyNo, employeeId: p.emp, penaltyType: p.type, value: p.value ?? null, computedAmount: p.amount,
    reason: p.reason, decisionRef: p.ref, decisionDate: p.date, issuedByUserId: p.issuedBy ?? "hrManager",
    spreadOverMonths: p.amounts ? p.amounts.length : p.months ?? 1, startPeriodId: p.start, remainingAmount: remaining, status: p.status,
    approvedBy: hasSchedule ? "hrManager" : null, approvedAt: hasSchedule ? p.date + "T12:00:00Z" : null, comments: p.comments ?? null,
    createdAt: p.date + "T10:00:00Z", updatedAt: p.date + "T10:00:00Z",
  });
  installments.push(...rows);
  const ev = (action, actor, at, ar, en) =>
    log.push({ id: `pa-${String(log.length + 1).padStart(3, "0")}`, penaltyId: id, action, actor: actors[actor], timestamp: at + "T10:00:00Z", summary: L(ar, en) });
  ev("Created", p.issuedBy === "deptHead" ? "po" : "hr", p.date, `إنشاء العقوبة — القرار ${p.ref}`, `Penalty created — decision ${p.ref}`);
  if (hasSchedule) ev("Approved", "hr", p.date, "اعتماد العقوبة وتوليد الأقساط", "Approved; instalments generated");
  rows.filter((r) => r.status === "Deducted").forEach((r) =>
    log.push({ id: `pa-${String(log.length + 1).padStart(3, "0")}`, penaltyId: id, action: "Deducted", actor: actors.po, timestamp: periodEnd(r.duePeriodId) + "T18:00:00Z", summary: L(`استقطاع القسط ${r.seqNo} من راتب ${r.duePeriodId}`, `Instalment ${r.seqNo} deducted from ${r.duePeriodId} payroll`) })
  );
  if (p.status === "Applied") ev("Applied", "po", periodEnd(rows[rows.length - 1].duePeriodId), "اكتمل استقطاع العقوبة", "Penalty fully applied");
  if (p.status === "Cancelled") ev("Cancelled", "hr", p.date, "إلغاء العقوبة", "Penalty cancelled");
}

// Study 12.4: "قطع 5 أيام راتب" (decision DISC-2026-014) = 5 × 34,615
add({ n: 1, emp: "emp-011", type: "DaysOfPay", value: 5, amount: 173075, reason: "غياب متكرر وتأخير عن الدوام الرسمي", ref: "DISC-2026-014", date: "2026-09-28", status: "Approved", start: "2026-10", amounts: [173075] });
// Fixed amount spread over 3 months, two instalments already taken
add({ n: 2, emp: "emp-010", type: "FixedAmount", value: 150000, amount: 150000, reason: "إهمال في تأمين معدات الموقع", ref: "DISC-2026-009", date: "2026-07-20", status: "Applying", start: "2026-08", amounts: [50000, 50000, 50000], deducted: 2 });
// Percentage penalty fully applied
add({ n: 3, emp: "emp-013", type: "PercentOfSalary", value: 10, amount: 109500, reason: "مخالفة تعليمات الانضباط الوظيفي", ref: "DISC-2026-006", date: "2026-06-18", status: "Applied", start: "2026-07", amounts: [109500], deducted: 1 });
// One-month salary penalty → automatically spread (Draft: shows the live plan)
add({ n: 4, emp: "emp-016", type: "OneMonthSalary", amount: 700000, reason: "مخالفة جسيمة لسياسة أمن المعلومات", ref: "DISC-2026-017", date: "2026-10-04", status: "Draft", start: "2026-11", months: 4 });
// Cancelled before any deduction
add({ n: 5, emp: "emp-018", type: "FixedAmount", value: 100000, amount: 100000, reason: "تأخير تسليم مستندات المناقصة", ref: "DISC-2026-011", date: "2026-07-08", status: "Cancelled", start: "2026-08", months: 1 });
// Draft proposed by a department head
add({ n: 6, emp: "emp-008", type: "DaysOfPay", value: 2, amount: 69230, reason: "التغيّب عن موقع العمل دون إذن", ref: "DISC-2026-018", date: "2026-10-05", status: "Draft", start: "2026-11", months: 1, issuedBy: "deptHead" });
// Approved, two instalments
add({ n: 7, emp: "emp-004", type: "FixedAmount", value: 250000, amount: 250000, reason: "مخالفة إجراءات تسليم مشاريع تقنية المعلومات", ref: "DISC-2026-015", date: "2026-10-01", status: "Approved", start: "2026-11", amounts: [125000, 125000] });
// Applied (single instalment)
add({ n: 8, emp: "emp-021", type: "FixedAmount", value: 50000, amount: 50000, reason: "مخالفة تعليمات الصحة والسلامة", ref: "DISC-2026-012", date: "2026-08-30", status: "Applied", start: "2026-09", amounts: [50000], deducted: 1 });

log.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
write("payroll/penalties.json", penalties);
write("payroll/penalty-installments.json", installments);
write("payroll/penalty-activity-log.json", log);
console.log("attendance rows:", summary.length, "| penalties:", penalties.length, "| instalments:", installments.length, "| log:", log.length);
