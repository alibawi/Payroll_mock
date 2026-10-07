// Generates the module-5 mock data by running the REAL calculation engine over the earlier modules' seeds:
//   mock-data/payroll/{periods,inputs,runs,payslips,payslip-lines,run-schedule-items,run-journals,run-activity-log}.json
//   mock-data/hr/{leave-periods,holidays}.json  (+ October attendance rows appended to hr/attendance-summary.json)
// Past months (Jan–Sep 2026) are Paid/Posted so the loan and penalty instalments already marked Deducted by modules
// 3–4 point at real payslips (`ps-<YYYY-MM>-<employeeId>`); the current month (Oct 2026) shows the run lifecycle.
// Run: node scripts/gen-run-data.js
const fs = require("fs");
const path = require("path");
require("./ts-register");

const { calculateRun } = require("../lib/payroll/run-calc.ts");
const { buildPostingJournal, buildPaymentJournal, buildReversalJournal } = require("../lib/payroll/run-journal.ts");

const dir = path.join(__dirname, "..", "mock-data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const write = (f, data) => fs.writeFileSync(path.join(dir, f), JSON.stringify(data, null, 2) + "\n");

const bundle = {
  components: read("payroll/components.json"),
  structures: read("payroll/structures.json"),
  profiles: read("payroll/profiles.json"),
  gradeScales: read("payroll/grade-scales.json"),
  taxConfigs: read("payroll/tax-configs.json"),
  pensionConfigs: read("payroll/pension-configs.json"),
  socialSecurityConfigs: read("payroll/social-security-configs.json"),
};
const employees = read("hr/employees.json");
const compensations = read("payroll/compensations.json");
const overrides = read("payroll/compensation-components.json");
const loans = read("payroll/loans.json");
const loanRows = read("payroll/loan-installments.json");
const penalties = read("payroll/penalties.json");
const penaltyRows = read("payroll/penalty-installments.json");
const accounts = read("payroll/gl-accounts.json");
const settings = read("payroll/settings.json");
const names = Object.fromEntries(accounts.map((a) => [a.code, a.name]));
const minimumWage = settings[0]?.minimumWage ?? 350000;

const KEYS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const CURRENT = "2026-10";
const SHORT = { "pf-gov": "gov", "pf-priv": "priv" };
const pad = (n, w = 4) => String(n).padStart(w, "0");
const lastDay = (key) => { const [y, m] = key.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

// ── attendance: October rows (Jan–Jul fall back to full attendance in the engine) ───────────────
const EARLY = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];
const attendancePath = "hr/attendance-summary.json";
const attendance = read(attendancePath).filter((a) => a.periodId !== CURRENT && !EARLY.includes(a.periodId));
// emp-009 is on paid annual leave since 20 Sep (lv-001): the earlier seed marked the whole of Aug/Sep as unpaid leave, which would zero the pay
for (const a of attendance) if (a.employeeId === "emp-009" && a.lwpDays === 26) a.lwpDays = 0;
const present = employees.filter((e) => e.status === "active" || e.status === "on_leave");
const octoberLate = { "emp-001": [8], "emp-004": [14, 22], "emp-006": [], "emp-011": [12], "emp-012": [18], "emp-015": [9, 33], "emp-016": [40] };
for (const e of present) {
  attendance.push({
    id: `as-${e.id.slice(4)}-${CURRENT}`,
    employeeId: e.id,
    periodId: CURRENT,
    workingDays: 27,
    calendarDays: 31,
    absenceDays: e.id === "emp-010" ? 1 : 0,
    lateEvents: octoberLate[e.id] ?? [],
    lwpDays: 0,
    overtimeHours: e.id === "emp-008" ? 10 : e.id === "emp-015" ? 6 : e.id === "emp-010" ? 4 : 0,
  });
}
// Jan–Jul: ordinary months (a few late arrivals / an absence) so history is not all-perfect
const earlyEvents = { "2026-03": { "emp-004": [20] }, "2026-05": { "emp-010": [12, 35] }, "2026-06": { "emp-013": [18] } };
for (const key of EARLY) {
  for (const e of employees.filter((x) => x.joiningDate <= key + "-28" && (!x.terminationDate || x.terminationDate >= key + "-01") && x.status !== "archived")) {
    attendance.push({
      id: `as-${e.id.slice(4)}-${key}`, employeeId: e.id, periodId: key, workingDays: 26, calendarDays: lastDay(key),
      absenceDays: key === "2026-05" && e.id === "emp-010" ? 1 : 0, lateEvents: earlyEvents[key]?.[e.id] ?? [], lwpDays: 0, overtimeHours: e.id === "emp-008" && key === "2026-06" ? 8 : 0,
    });
  }
}
attendance.sort((a, b) => a.periodId.localeCompare(b.periodId) || a.employeeId.localeCompare(b.employeeId));
write(attendancePath, attendance);

// ── HR placeholders: leave periods and holidays ─────────────────────────────────────────────────
const leavePeriods = [
  { id: "lv-001", employeeId: "emp-009", startDate: "2026-09-20", endDate: "2026-10-12", days: 23, leaveType: "Annual", isPaid: true },
  { id: "lv-002", employeeId: "emp-017", startDate: "2026-10-04", endDate: "2026-10-18", days: 15, leaveType: "Annual", isPaid: true },
  { id: "lv-003", employeeId: "emp-012", startDate: "2026-06-08", endDate: "2026-06-10", days: 3, leaveType: "Sick", isPaid: true },
  { id: "lv-004", employeeId: "emp-013", startDate: "2026-04-14", endDate: "2026-04-16", days: 3, leaveType: "Annual", isPaid: true },
  { id: "lv-005", employeeId: "emp-010", startDate: "2026-08-11", endDate: "2026-08-12", days: 2, leaveType: "Unpaid", isPaid: false },
];
write("hr/leave-periods.json", leavePeriods);
const holiday = (id, date, ar, en) => ({ id, date, name: { ar, en } });
write("hr/holidays.json", [
  holiday("h-01", "2026-01-01", "رأس السنة الميلادية", "New Year's Day"),
  holiday("h-02", "2026-01-06", "عيد الجيش العراقي", "Iraqi Army Day"),
  holiday("h-03", "2026-03-21", "عيد النوروز", "Nowruz"),
  holiday("h-04", "2026-03-20", "عيد الفطر", "Eid al-Fitr"),
  holiday("h-05", "2026-05-01", "عيد العمال", "Labour Day"),
  holiday("h-06", "2026-05-27", "عيد الأضحى", "Eid al-Adha"),
  holiday("h-07", "2026-06-17", "رأس السنة الهجرية", "Islamic New Year"),
  holiday("h-08", "2026-06-26", "عاشوراء", "Ashura"),
  holiday("h-09", "2026-07-14", "ذكرى ثورة 14 تموز", "Republic Day"),
  holiday("h-10", "2026-08-25", "المولد النبوي", "Mawlid"),
  holiday("h-11", "2026-10-03", "ذكرى انضمام العراق للأمم المتحدة", "Iraq UN membership day"),
]);

// ── periods ─────────────────────────────────────────────────────────────────────────────────────
const periods = [];
for (const profile of bundle.profiles) {
  KEYS.forEach((key, i) => {
    const [year, month] = key.split("-").map(Number);
    const end = `${key}-${pad(lastDay(key), 2)}`;
    const cutoff = `${key}-${pad(Math.min(profile.cutoffDay, lastDay(key)), 2)}`;
    const status = key === "2026-09" ? (profile.id === "pf-priv" ? "Locked" : "Closed") : key === CURRENT ? "Open" : "Closed";
    periods.push({
      id: `pp-${key}-${SHORT[profile.id]}`,
      periodKey: key,
      profileId: profile.id,
      periodType: "Monthly",
      year,
      sequenceNo: month,
      startDate: `${key}-01`,
      endDate: end,
      cutoffDate: cutoff,
      payDate: end,
      postingPeriodId: `FP-${key}`,
      status,
      createdAt: `${i === 0 ? "2026-01" : key}-01T08:00:00Z`.replace(/^(\d{4}-\d{2})-01T/, "$1-01T"),
    });
  });
}
const periodOf = (key, profileId) => periods.find((p) => p.periodKey === key && p.profileId === profileId);

// ── inputs ──────────────────────────────────────────────────────────────────────────────────────
const comp = (code) => bundle.components.find((c) => c.code === code).id;
const mkInput = (n, periodKey, employeeId, code, amount, reason, status, appliedRunId, extra = {}) => ({
  id: `in-${pad(n)}`, periodKey, employeeId, componentId: comp(code), amount, quantity: null, reason, isRetroAdjustment: false,
  status, appliedRunId, createdBy: "payrollOfficer", createdAt: `${periodKey}-15T09:00:00Z`, ...extra,
});
const inputs = [
  mkInput(1, "2026-03", "emp-005", "BONUS", 500000, "مكافأة إنجاز مشروع", "Applied", "run-2026-03-gov"),
  mkInput(2, "2026-06", "emp-010", "OTHER_DEDUCTION", 25000, "تلف عهدة", "Applied", "run-2026-06-priv"),
  mkInput(3, "2026-09", "emp-004", "BONUS", 300000, "مكافأة نهاية مشروع", "Applied", "run-2026-09-gov"),
  mkInput(4, "2026-10", "emp-008", "BONUS", 250000, "مكافأة أداء ربعية", "Pending", "run-2026-10-priv"),
  mkInput(5, "2026-10", "emp-001", "BONUS", 400000, "مكافأة عيد", "Pending", "run-2026-10-gov-bonus"),
  mkInput(6, "2026-10", "emp-003", "BONUS", 300000, "مكافأة عيد", "Pending", "run-2026-10-gov-bonus"),
  mkInput(7, "2026-10", "emp-006", "BONUS", 300000, "مكافأة عيد", "Pending", "run-2026-10-gov-bonus"),
  mkInput(8, "2026-10", "emp-004", "BONUS", 150000, "تسوية أثر رجعي — علاوة شهر 9", "Pending", null, { isRetroAdjustment: true }),
  mkInput(9, "2026-10", "emp-013", "OTHER_DEDUCTION", 15000, "غرامة موقف سيارات", "Pending", null),
  mkInput(10, "2026-10", "emp-016", "BONUS", 100000, "مكافأة تعيين", "Pending", null),
  mkInput(11, "2026-10", "emp-002", "BONUS", 200000, "مكافأة (أُلغيت)", "Cancelled", null),
  // bigger than the monthly cap on purpose: shows net protection (AutoSpread) in the calculated October run
  mkInput(12, "2026-10", "emp-013", "COURT_ORDER", 400000, "حجز قضائي — دعوى نفقة", "Pending", "run-2026-10-gov"),
];

// ── runs ────────────────────────────────────────────────────────────────────────────────────────
const org = "org-enki";
const planned = []; // { id, key, profileId, type, status, scope?, ... } in creation order
for (const key of KEYS) {
  for (const profile of bundle.profiles) {
    const short = SHORT[profile.id];
    if (key === "2026-07" && short === "priv") {
      planned.push({ id: "run-2026-07-priv-a", key, profileId: profile.id, type: "Regular", status: "Reversed", reversedBy: "run-2026-07-priv" });
    }
    const regularStatus = key === CURRENT ? (short === "gov" ? "Calculated" : "PendingApproval") : key === "2026-09" && short === "priv" ? "Posted" : "Paid";
    planned.push({ id: `run-${key}-${short}`, key, profileId: profile.id, type: "Regular", status: regularStatus });
  }
  if (key === CURRENT) {
    planned.push({ id: "run-2026-10-gov-bonus", key, profileId: "pf-gov", type: "Bonus", status: "Approved", scope: { employeeIds: ["emp-001", "emp-003", "emp-006"] }, note: "مكافأة العيد" });
    planned.push({ id: "run-2026-10-priv-off", key, profileId: "pf-priv", type: "OffCycle", status: "Draft", scope: { employeeIds: ["emp-016"] }, note: "دورة خارجية — مكافأة تعيين" });
  }
}

const runs = [];
const payslips = [];
const lines = [];
const schedule = [];
const journals = [];
const activity = [];
let jvSeq = 0;
let pvSeq = 0;
let actSeq = 0;

const actor = {
  payrollOfficer: { name: { ar: "هبة الجبوري", en: "Hiba Al-Jubouri" }, role: "payrollOfficer" },
  hrManager: { name: { ar: "سلمى الكربولي", en: "Salma Al-Karbouli" }, role: "hrManager" },
  financeAccountant: { name: { ar: "محمد العبيدي", en: "Mohammed Al-Obaidi" }, role: "financeAccountant" },
};
const log = (runId, action, who, ar, en, ts) =>
  activity.push({ id: `ra-${pad(++actSeq)}`, runId, action, actor: actor[who], timestamp: ts, summary: { ar, en } });

planned.forEach((p, index) => {
  const profile = bundle.profiles.find((x) => x.id === p.profileId);
  const period = periodOf(p.key, p.profileId);
  const history = p.key !== CURRENT;
  const runNo = `PR-2026-${pad(index + 1)}`;
  const scopeFilter = { departments: [], costCenters: [], employeeIds: [], ...(p.scope ?? {}) };
  const run = { id: p.id, profileId: p.profileId, runType: p.type, periodKey: p.key, scopeFilter };

  // instalments due: history = what modules 3–4 already recorded as deducted; current = what is pending
  const payslipIdFor = (employeeId) => (p.type === "Regular" && p.status !== "Reversed" ? `ps-${p.key}-${employeeId}` : `ps-${p.id}-${employeeId}`);
  const loanDue = [];
  const penaltyDue = [];
  if (p.type === "Regular") {
    for (const r of loanRows) {
      const loan = loans.find((l) => l.id === r.loanId);
      const mine = history ? r.duePeriodId === p.key && r.status === "Deducted" && r.payslipId : r.duePeriodId <= p.key && r.status === "Pending" && ["Disbursed", "Active"].includes(loan.status);
      if (mine) loanDue.push({ installmentId: r.id, sourceRef: `${loan.loanNo} #${r.seqNo}`, employeeId: loan.employeeId, amount: r.amount });
    }
    for (const r of penaltyRows) {
      const pen = penalties.find((x) => x.id === r.penaltyId);
      const mine = history ? r.duePeriodId === p.key && r.status === "Deducted" && r.payslipId : r.duePeriodId <= p.key && r.status === "Pending" && ["Approved", "Applying"].includes(pen.status);
      if (mine) penaltyDue.push({ installmentId: r.id, sourceRef: `${pen.penaltyNo} #${r.seqNo}`, employeeId: pen.employeeId, amount: r.amount });
    }
  }

  const runInputs = inputs.filter((i) => i.appliedRunId === p.id);
  // history is generated with the monthly cap lifted: the earlier modules already recorded those instalments as fully deducted
  const histBundle = history
    ? { ...bundle, profiles: bundle.profiles.map((pr) => ({ ...pr, attendancePenaltyPolicy: { ...pr.attendancePenaltyPolicy, maxMonthlyDeductionPercent: 100 } })) }
    : bundle;

  const result = calculateRun({
    run, period, bundle: histBundle, employees, compensations, overrides, attendance, leavePeriods,
    inputs: runInputs, loanDue, penaltyDue, minimumWage, payslipIdFor,
  });
  if (p.status === "Draft") { result.payslips.length = 0; result.lines.length = 0; result.schedule.length = 0; result.warnings.length = 0; }

  const day = (d) => `${p.key}-${pad(Math.min(d, lastDay(p.key)), 2)}T09:00:00Z`;
  const calculated = p.status !== "Draft";
  const submitted = ["PendingApproval", "Approved", "Posted", "Paid", "Reversed"].includes(p.status);
  const approved = ["Approved", "Posted", "Paid", "Reversed"].includes(p.status);
  const posted = ["Posted", "Paid", "Reversed"].includes(p.status);
  const paid = p.status === "Paid";

  const r = {
    id: p.id, runNo, profileId: p.profileId, payrollPeriodId: period.id, periodKey: p.key, organizationId: org,
    runType: p.type, scopeFilter, status: p.status,
    employeeCount: result.totals.employeeCount, grossTotal: result.totals.grossTotal, deductionTotal: result.totals.deductionTotal,
    netTotal: result.totals.netTotal, employerCostTotal: result.totals.employerCostTotal,
    journalEntryId: null, journalRef: null, paymentRef: null, baseType: "PAYRUN",
    reversalRunId: p.reversedBy ?? null, reversalReason: p.status === "Reversed" ? "ساعات إضافية مدخلة بشكل خاطئ — أُعيد الاحتساب" : null, rejectionReason: null,
    warnings: result.warnings,
    calculatedAt: calculated ? day(history ? 24 : 6) : null, submittedAt: submitted ? day(history ? 25 : 7) : null,
    approvedAt: approved ? day(history ? 26 : 8) : null, approvedBy: approved ? "hrManager" : null,
    postedAt: posted ? day(history ? 27 : 9) : null, paidAt: paid ? day(history ? 28 : 10) : null,
    reversedAt: p.status === "Reversed" ? day(history ? 29 : 11) : null,
    note: p.note ?? null, createdBy: "payrollOfficer", createdAt: day(history ? 22 : 5), updatedAt: day(history ? 28 : 10),
  };

  if (posted) {
    const ref = `JV-PAYRUN-${pad(++jvSeq)}`;
    r.journalRef = ref;
    r.journalEntryId = `je-${ref}`;
    const posting = buildPostingJournal({ run: r, payslips: result.payslips, lines: result.lines, names, journalRef: ref });
    journals.push(...posting);
    if (p.status === "Reversed") journals.push(...buildReversalJournal(posting, `${ref}-R`));
    if (paid) {
      const payRef = `PV-PAYRUN-${pad(++pvSeq)}`;
      r.paymentRef = payRef;
      journals.push(...buildPaymentJournal({ run: r, payslips: result.payslips, names, journalRef: payRef }));
      for (const ps of result.payslips) { ps.paidStatus = "Paid"; ps.paidDate = r.paidAt.slice(0, 10); ps.paymentDocRef = `${payRef}/${ps.employeeId.slice(4)}`; }
    }
    for (const s of result.schedule) s.status = "Applied";
  }

  runs.push(r);
  payslips.push(...result.payslips);
  lines.push(...result.lines);
  schedule.push(...result.schedule);

  // audit trail
  log(p.id, "Created", "payrollOfficer", `إنشاء دورة ${runNo}`, `Run ${runNo} created`, r.createdAt);
  if (calculated) log(p.id, "Calculated", "payrollOfficer", `احتساب ${result.totals.employeeCount} قسيمة`, `Calculated ${result.totals.employeeCount} payslips`, r.calculatedAt);
  if (submitted) log(p.id, "Submitted", "payrollOfficer", "إرسال للاعتماد", "Submitted for approval", r.submittedAt);
  if (approved) log(p.id, "Approved", "hrManager", "اعتماد الدورة", "Run approved", r.approvedAt);
  if (posted) log(p.id, "Posted", "financeAccountant", `ترحيل القيد ${r.journalRef}`, `Posted journal ${r.journalRef}`, r.postedAt);
  if (paid) log(p.id, "Paid", "financeAccountant", `صرف الرواتب — ${r.paymentRef}`, `Salaries paid — ${r.paymentRef}`, r.paidAt);
  if (p.status === "Reversed") log(p.id, "Reversed", "financeAccountant", `عكس الدورة: ${r.reversalReason}`, "Run reversed: overtime hours were entered incorrectly", r.reversedAt);
});

// loan / penalty instalments reference payslips by the same ids — verify nothing dangles
const ids = new Set(payslips.map((x) => x.id));
const dangling = [...loanRows, ...penaltyRows].filter((r) => r.payslipId && !ids.has(r.payslipId));
if (dangling.length) console.warn(`WARNING ${dangling.length} instalment payslip refs without a payslip:`, dangling.map((d) => d.payslipId).join(", "));

write("payroll/periods.json", periods);
write("payroll/inputs.json", inputs);
write("payroll/runs.json", runs);
write("payroll/payslips.json", payslips);
write("payroll/payslip-lines.json", lines);
write("payroll/run-schedule-items.json", schedule);
write("payroll/run-journals.json", journals);
write("payroll/run-activity-log.json", activity);

console.log(`periods ${periods.length} · inputs ${inputs.length} · runs ${runs.length} · payslips ${payslips.length} · lines ${lines.length} · schedule ${schedule.length} · journal lines ${journals.length}`);
for (const r of runs) {
  const blockers = r.warnings.filter((w) => w.severity === "Blocker").length;
  console.log(`${r.runNo} ${r.id.padEnd(24)} ${r.status.padEnd(16)} emp ${String(r.employeeCount).padStart(2)} gross ${String(r.grossTotal).padStart(10)} net ${String(r.netTotal).padStart(10)} warnings ${r.warnings.length}${blockers ? ` (${blockers} BLOCKER)` : ""}`);
}
