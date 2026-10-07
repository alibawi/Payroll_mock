// Generates the module-6 mock data: hr/leave-balances.json, payroll/{end-of-service,end-of-service-activity-log,remittance-status}.json.
// End-of-service amounts come from the real calculator (lib/payroll/eos*.ts). Run: node scripts/gen-report-data.js
const fs = require("fs");
const path = require("path");
require("./ts-register");
const { eosContext, eosFor } = require("../lib/payroll/eos-context.ts");

const dir = path.join(__dirname, "..", "mock-data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const write = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 2) + "\n");

const employees = read("hr/employees.json");
const leaves = read("hr/leave-requests.json");
const balances = employees.map((e, i) => {
  const last = leaves.filter((l) => l.employeeId === e.id && l.leaveType === "annual").pop();
  return { id: `lb-${e.id.slice(4)}`, employeeId: e.id, annualDays: last?.balanceAfter ?? 8 + ((i * 7) % 19) };
});
write("hr/leave-balances.json", balances);

const data = {
  bundle: {
    components: read("payroll/components.json"),
    structures: read("payroll/structures.json"),
    profiles: read("payroll/profiles.json"),
    gradeScales: read("payroll/grade-scales.json"),
    taxConfigs: read("payroll/tax-configs.json"),
    pensionConfigs: read("payroll/pension-configs.json"),
    socialSecurityConfigs: read("payroll/social-security-configs.json"),
  },
  employees,
  compensations: read("payroll/compensations.json"),
  overrides: read("payroll/compensation-components.json"),
  balances,
};

const actor = {
  payrollOfficer: { name: { ar: "هبة الجبوري", en: "Hiba Al-Jubouri" }, role: "payrollOfficer" },
  hrManager: { name: { ar: "سلمى الكربولي", en: "Salma Al-Karbouli" }, role: "hrManager" },
  financeAccountant: { name: { ar: "محمد العبيدي", en: "Mohammed Al-Obaidi" }, role: "financeAccountant" },
};
const plans = [
  { employeeId: "emp-014", date: "2026-08-31", reason: "Resignation", leave: null, comp: 0, status: "Paid", notes: "استقالة بإشعار مسبق" },
  { employeeId: "emp-018", date: "2026-07-31", reason: "Termination", leave: null, comp: 1500000, status: "Approved", notes: "إنهاء بقرار الإدارة — تعويض فصل تعسفي بحكم قضائي" },
  { employeeId: "emp-012", date: "2026-11-30", reason: "ContractEnd", leave: null, comp: 0, status: "Draft", notes: "انتهاء العقد" },
  { employeeId: "emp-016", date: "2026-10-05", reason: "DismissalDisciplinary", leave: null, comp: 0, status: "Draft", notes: "فصل تأديبي — لا مكافأة (T-6)" },
  { employeeId: "emp-021", date: "2026-09-30", reason: "Resignation", leave: null, comp: 0, status: "Cancelled", notes: "عدل الموظف عن الاستقالة" },
];
const eos = [];
const activity = [];
let act = 0;
const log = (eosId, action, who, ar, en, timestamp) => activity.push({ id: `ea-${String(++act).padStart(3, "0")}`, eosId, action, actor: actor[who], timestamp, summary: { ar, en } });
plans.forEach((p, i) => {
  const ctx = eosContext(data, p.employeeId, p.date);
  const leaveDays = p.leave ?? ctx.defaultLeaveDays;
  const r = eosFor(ctx, p.reason, leaveDays, p.comp);
  const id = `eos-${String(i + 1).padStart(3, "0")}`;
  const eosNo = `EOS-2026-${String(i + 1).padStart(4, "0")}`;
  const ts = (d) => `${d}T09:00:00Z`;
  const paid = p.status === "Paid";
  const approved = paid || p.status === "Approved";
  eos.push({
    id, eosNo, employeeId: p.employeeId, terminationDate: p.date, terminationReason: p.reason, serviceYears: ctx.serviceYears, lastWage: ctx.lastWage,
    gratuityAmount: r.gratuityAmount, accruedLeaveDays: leaveDays, accruedLeavePay: r.accruedLeavePay, arbitraryDismissalCompensation: r.arbitraryDismissalCompensation,
    totalAmount: r.totalAmount, status: p.status, journalRef: paid ? "JV-EOS-0001" : null, paymentRef: paid ? "PV-EOS-0001" : null,
    approvedBy: approved ? "hrManager" : null, approvedAt: approved ? ts("2026-09-02") : null, paidAt: paid ? ts("2026-09-05") : null,
    notes: p.notes, createdBy: "payrollOfficer", createdAt: ts("2026-09-01"), updatedAt: ts("2026-09-05"),
  });
  log(id, "Created", "payrollOfficer", `إنشاء مطالبة ${eosNo}`, `Claim ${eosNo} created`, ts("2026-09-01"));
  if (approved) log(id, "Approved", "hrManager", "اعتماد المطالبة", "Claim approved", ts("2026-09-02"));
  if (paid) log(id, "Paid", "financeAccountant", "دفع المطالبة — PV-EOS-0001", "Claim paid — PV-EOS-0001", ts("2026-09-05"));
  if (p.status === "Cancelled") log(id, "Cancelled", "hrManager", "إلغاء المطالبة", "Claim cancelled", ts("2026-09-10"));
  console.log(eosNo, p.employeeId, p.reason.padEnd(22), p.status.padEnd(9), "years", ctx.serviceYears, "wage", ctx.lastWage, "total", r.totalAmount);
});
write("payroll/end-of-service.json", eos);
write("payroll/end-of-service-activity-log.json", activity);

// remittance status per month and authority (Jan–Aug remitted; Sep outstanding; Oct not posted yet)
const rem = [];
let pv = 0;
for (const m of ["01", "02", "03", "04", "05", "06", "07", "08", "09"]) {
  for (const kind of ["tax", "pension", "socialSecurity"]) {
    const done = m <= "08";
    rem.push({
      id: `rem-2026-${m}-${kind}`, periodKey: `2026-${m}`, kind, status: done ? "Remitted" : "NotRemitted",
      remittedAt: done ? `2026-${m}-28T09:00:00Z`.replace(/-28T/, "-30T").replace("2026-02-30", "2026-02-28") : null,
      voucherRef: done ? `PV-REM-${String(++pv).padStart(4, "0")}` : null,
    });
  }
}
write("payroll/remittance-status.json", rem);
console.log(`leave balances ${balances.length} · eos ${eos.length} · remittances ${rem.length}`);
