// One-off generator for module 2 seed data (compensations, per-employee overrides, activity log,
// settings, import sample). Requires scripts/gen-config-data.js to have run first.
// Run: node scripts/gen-compensation-data.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "mock-data", "payroll") + path.sep;
const read = (f) => JSON.parse(fs.readFileSync(dir + f, "utf-8"));
const write = (f, d) => fs.writeFileSync(dir + f, JSON.stringify(d, null, 2) + "\n");
const L = (ar, en) => ({ ar, en });

// HR tweak so study example 12.1 is a real employee: emp-007 is married with 3 children.
const hrFile = path.join(__dirname, "..", "mock-data", "hr", "employees.json");
const employees = JSON.parse(fs.readFileSync(hrFile, "utf-8"));
const emp007 = employees.find((e) => e.id === "emp-007");
emp007.maritalStatus = "married";
emp007.numOfChildren = 3;
fs.writeFileSync(hrFile, JSON.stringify(employees, null, 2) + "\n");
const hr = Object.fromEntries(employees.map((e) => [e.id, e]));

const components = read("components.json");
const cid = (code) => components.find((c) => c.code === code).id;

const marital = (e) => ({ married: "Married", single: "Single", divorced: "Divorced", widowed: "Widowed" })[e.maritalStatus];
const account = (n) => `IQ98NBIQ0100${String(1000000 + n * 7919).padStart(8, "0")}`;
const GOV = { profileId: "pf-gov" };
const PRIV = { profileId: "pf-priv" };

const records = [];
const overrides = [];
const log = [];
let seq = 0;
const actors = {
  hr: { name: L("سلمى الكربولي", "Salma Al-Karbouli"), role: "hrManager" },
  po: { name: L("هبة الجبوري", "Hiba Al-Jubouri"), role: "payrollOfficer" },
};

/**
 * @param {string} employeeId
 * @param {object} o  profile/structure/from/to/gradeStepId/baseSalary/reason/ovs/pay
 */
function add(employeeId, o) {
  const e = hr[employeeId];
  const id = `ec-${employeeId.slice(4)}-${++seq}`;
  records.push({
    id, employeeId,
    profileId: o.profileId, salaryStructureId: o.structure,
    effectiveFrom: o.from, effectiveTo: o.to ?? null, currencyCode: "IQD",
    paymentMethod: o.pay ?? "Bank", bankAccountNo: (o.pay ?? "Bank") === "Bank" ? account(Number(employeeId.slice(4))) : null,
    costCenterId: e.costCenter, projectId: o.projectId ?? null,
    gradeStepId: o.gradeStepId ?? null, baseSalary: o.baseSalary ?? null,
    taxMaritalStatus: marital(e), eligibleChildrenCount: e.numOfChildren, isPensionExempt: false,
    changeReason: o.reason ?? null, createdBy: "payrollOfficer", createdAt: (o.at ?? o.from) + "T08:00:00Z",
  });
  (o.ovs ?? []).forEach(([code, amount, percent], i) => {
    overrides.push({ id: `${id}-o${i + 1}`, compensationId: id, componentId: cid(code), amount: amount ?? null, percent: percent ?? null });
  });
  log.push({
    id: `cl-${String(log.length + 1).padStart(3, "0")}`, employeeId, compensationId: id,
    action: o.action ?? "Assigned", actor: actors[o.actor ?? "po"], timestamp: (o.at ?? o.from) + "T08:00:00Z",
    summary: L(`اعتباراً من ${o.from}${o.reason ? ` — ${o.reason}` : ""}`, `Effective ${o.from}${o.reasonEn ? ` — ${o.reasonEn}` : ""}`),
    changes: o.changes ?? null,
  });
  return id;
}

const govOvs = (cert, pos, incr, extra = []) => [
  ["CERT_ALLOWANCE", cert], ["POSITION_ALLOWANCE", pos], ...(incr ? [["ANNUAL_INCREMENT", incr]] : []), ...extra,
];
const privOvs = (housing, transport, extra = []) => [
  ...(housing ? [["HOUSING_ALLOWANCE", housing]] : []), ["TRANSPORT_ALLOWANCE_PRIV", transport], ...extra,
];
const gov = (employeeId, step, cert, pos, incr, from, reason, reasonEn, extra) =>
  add(employeeId, { ...GOV, structure: "st-gov-2026", from, gradeStepId: step, ovs: govOvs(cert, pos, incr, extra), reason, reasonEn });

// ---- Government (permanent) ----
gov("emp-001", "gs-1-5", 80000, 400000, 180000, "2026-01-01", "هيكل 2026", "2026 structure");
// emp-002: current + a scheduled increment (Upcoming)
add("emp-002", { ...GOV, structure: "st-gov-2026", from: "2026-01-01", to: "2026-12-31", gradeStepId: "gs-2-6", ovs: govOvs(60000, 300000, 120000), reason: "هيكل 2026", reasonEn: "2026 structure" });
add("emp-002", { ...GOV, structure: "st-gov-2026", from: "2027-01-01", gradeStepId: "gs-2-7", ovs: govOvs(60000, 300000, 160000), reason: "علاوة سنوية مجدولة", reasonEn: "Scheduled annual increment", action: "Increment", actor: "hr", at: "2026-09-15" });
gov("emp-003", "gs-2-4", 60000, 300000, 90000, "2026-01-01", "هيكل 2026", "2026 structure");
// emp-004: promotion on 2026-01-01
add("emp-004", { ...GOV, structure: "st-gov-2024", from: "2021-01-01", to: "2025-12-31", gradeStepId: "gs-3-9", ovs: govOvs(60000, 250000, 100000), reason: "تعيين أولي", reasonEn: "Initial hire" });
add("emp-004", { ...GOV, structure: "st-gov-2026", from: "2026-01-01", gradeStepId: "gs-2-3", ovs: govOvs(60000, 300000, 100000), reason: "ترفيع إلى الدرجة الثانية", reasonEn: "Promotion to grade 2", action: "Promotion", actor: "hr", changes: [{ field: "gradeStepId", from: "gs-3-9", to: "gs-2-3" }] });
gov("emp-005", "gs-3-7", 45000, 250000, 80000, "2026-01-01", "هيكل 2026", "2026 structure");
// emp-006: annual increment on 2026-01-01
add("emp-006", { ...GOV, structure: "st-gov-2024", from: "2021-01-01", to: "2025-12-31", gradeStepId: "gs-3-7", ovs: govOvs(60000, 250000, 75000), reason: "تعيين أولي", reasonEn: "Initial hire" });
add("emp-006", { ...GOV, structure: "st-gov-2026", from: "2026-01-01", gradeStepId: "gs-3-8", ovs: govOvs(60000, 250000, 95000), reason: "علاوة سنوية", reasonEn: "Annual increment", action: "Increment", actor: "hr", changes: [{ field: "gradeStepId", from: "gs-3-7", to: "gs-3-8" }] });
// emp-007: study example 12.1 — grade 7 / step 3, bachelor, head of section, married + 3 children
gov("emp-007", "gs-7-3", 45000, 150000, 45000, "2026-01-01", "هيكل 2026 (مثال الدراسة 12.1)", "2026 structure (study example 12.1)");
gov("emp-009", "gs-6-5", 45000, 0, 60000, "2026-01-01", "هيكل 2026", "2026 structure", [["HAZARD_ALLOWANCE_GOV", null, null]]);
gov("emp-013", "gs-8-4", 30000, 0, 36000, "2026-01-01", "هيكل 2026", "2026 structure");
gov("emp-017", "gs-8-2", 45000, 0, 24000, "2026-01-01", "هيكل 2026", "2026 structure");
// emp-020: permanent but intentionally WITHOUT compensation (KPI alert / assign flow)

// ---- Private sector (contract / temporary) ----
// emp-008: study example 12.2 — basic 900,000 + housing 200,000 + transport 100,000, married + 2 children
add("emp-008", { ...PRIV, structure: "st-priv-admin", from: "2026-01-01", baseSalary: 900000, ovs: privOvs(200000, 100000, [["PHONE_ALLOWANCE", 0]]), reason: "عقد 2026 (مثال الدراسة 12.2)", reasonEn: "2026 contract (study example 12.2)" });
add("emp-010", { ...PRIV, structure: "st-priv-workers", from: "2026-01-01", baseSalary: 600000, ovs: privOvs(120000, 100000, [["FOOD_ALLOWANCE", 50000], ["HAZARD_ALLOWANCE_PRIV", null, 12]]), reason: "عقد 2026", reasonEn: "2026 contract", pay: "Cash" });
// emp-011: base-only wage of 900,000 → the study 12.4 attendance / penalty case (day rate 900,000 ÷ 26 = 34,615)
add("emp-011", { ...PRIV, structure: "st-priv-admin", from: "2026-01-01", baseSalary: 900000, ovs: [], reason: "عقد 2026 (مثال الدراسة 12.4)", reasonEn: "2026 contract (study example 12.4)" });
// emp-012: contract adjustment on 2026-03-01
add("emp-012", { ...PRIV, structure: "st-priv-admin", from: "2025-01-15", to: "2026-02-28", baseSalary: 900000, ovs: privOvs(200000, 100000), reason: "تعيين أولي", reasonEn: "Initial hire" });
add("emp-012", { ...PRIV, structure: "st-priv-admin", from: "2026-03-01", baseSalary: 1000000, ovs: privOvs(200000, 100000, [["PHONE_ALLOWANCE", 25000]]), reason: "تعديل عقد", reasonEn: "Contract adjustment", action: "Adjusted", actor: "hr", changes: [{ field: "baseSalary", from: "900000", to: "1000000" }] });
// emp-014: resigned 2026-08-31 — final record closed on the leaving date
add("emp-014", { ...PRIV, structure: "st-priv-admin", from: "2025-01-01", to: "2026-08-31", baseSalary: 850000, ovs: privOvs(150000, 100000, [["PHONE_ALLOWANCE", 25000]]), reason: "عقد", reasonEn: "Contract" });
add("emp-015", { ...PRIV, structure: "st-priv-admin", from: "2026-01-01", baseSalary: 1100000, ovs: privOvs(250000, 100000, [["PHONE_ALLOWANCE", 25000]]), reason: "عقد 2026", reasonEn: "2026 contract" });
// emp-016: recent hire (2026-08-01 → proration case)
add("emp-016", { ...PRIV, structure: "st-priv-admin", from: "2026-08-01", baseSalary: 700000, ovs: privOvs(100000, 100000), reason: "تعيين جديد", reasonEn: "New hire" });
// emp-018: terminated 2026-07-31
add("emp-018", { ...PRIV, structure: "st-priv-admin", from: "2025-01-01", to: "2026-07-31", baseSalary: 780000, ovs: privOvs(120000, 100000), reason: "عقد", reasonEn: "Contract" });
// emp-021: below the minimum wage on purpose (E-3 alert), recent hire 2026-08-20
add("emp-021", { ...PRIV, structure: "st-priv-admin", from: "2026-08-20", baseSalary: 300000, ovs: privOvs(0, 50000), reason: "تعيين مؤقت", reasonEn: "Temporary hire", pay: "Cash" });

log.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
write("compensations.json", records);
write("compensation-components.json", overrides);
write("compensation-activity-log.json", log);
write("settings.json", [{ id: "settings", minimumWage: 350000 }]);

// Rows of the mock Excel import (step 2 of the wizard shows how columns map; row-level flags drive the result).
write("compensation-import-sample.json", {
  fileName: "salaries-october-2026.xlsx",
  columns: [
    { header: "Employee Code", suggested: "employeeCode", sample: "EMP-2026-0020" },
    { header: "Profile", suggested: "profileId", sample: "GOVERNMENT_IQ" },
    { header: "Grade", suggested: "grade", sample: "8" },
    { header: "Step", suggested: "step", sample: "2" },
    { header: "Base Salary", suggested: "baseSalary", sample: "" },
    { header: "Effective From", suggested: "effectiveFrom", sample: "2026-11-01" },
    { header: "Payment", suggested: "paymentMethod", sample: "Bank" },
  ],
  rows: [
    { row: 2, employeeCode: "EMP-2026-0020", profile: "GOVERNMENT_IQ", grade: 7, step: 1, baseSalary: null, effectiveFrom: "2026-11-01", paymentMethod: "Bank", valid: true },
    { row: 3, employeeCode: "EMP-2026-0011", profile: "PRIVATE_IQ", grade: null, step: null, baseSalary: 850000, effectiveFrom: "2026-11-01", paymentMethod: "Bank", valid: true },
    { row: 4, employeeCode: "EMP-2026-0021", profile: "PRIVATE_IQ", grade: null, step: null, baseSalary: 380000, effectiveFrom: "2026-11-01", paymentMethod: "Cash", valid: true },
    { row: 5, employeeCode: "EMP-2026-0099", profile: "PRIVATE_IQ", grade: null, step: null, baseSalary: 700000, effectiveFrom: "2026-11-01", paymentMethod: "Bank", valid: false, error: L("الموظف غير موجود في HR", "Employee not found in HR") },
    { row: 6, employeeCode: "EMP-2026-0015", profile: "PRIVATE_IQ", grade: null, step: null, baseSalary: 250000, effectiveFrom: "2026-11-01", paymentMethod: "Bank", valid: false, error: L("الأجر أقل من الحد الأدنى للأجور (E-3)", "Wage below the minimum wage (E-3)") },
    { row: 7, employeeCode: "EMP-2026-0013", profile: "GOVERNMENT_IQ", grade: 8, step: 5, baseSalary: null, effectiveFrom: "2025-01-01", paymentMethod: "Bank", valid: false, error: L("تاريخ السريان قبل آخر سجل (E-1)", "Effective date is before the latest record (E-1)") },
  ],
});
console.log("compensations:", records.length, "overrides:", overrides.length, "log:", log.length);
