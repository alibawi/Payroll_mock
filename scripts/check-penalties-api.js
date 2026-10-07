// Smoke check of the penalties API + attendance simulator against study example 12.4. Needs `npm run dev`.
// Run: node scripts/check-penalties-api.js
const B = "http://localhost:3000/api/payroll";
const call = async (method, p, body, role) => {
  const r = await fetch(B + p, { method, headers: { "content-type": "application/json", ...(role ? { "x-mock-role": role } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, j: await r.json() };
};
const show = (label, r) => console.log(label.padEnd(46), r.status, r.j.error ? `${r.j.error} ${JSON.stringify(Object.values(r.j.details ?? {}).map((d) => d.rule))}` : "");

(async () => {
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
  const sim = await call("GET", "/attendance/simulate?employeeId=emp-011&period=2026-09");
  const s = sim.j;
  console.log("12.4 simulator:", { basis: s.basis, dayRate: s.dayRate, absence: s.absence.amount, lateness: s.lateness.total, grossAfter: s.grossAfter, cap: s.cap.amount });
  console.log("  lateness events:", s.lateness.events.map((e) => `${e.minutes}m→${e.rule}:${e.amount}`).join(", "));
  const days5 = await call("POST", "/penalties/preview", { employeeId: "emp-011", penaltyType: "DaysOfPay", value: 5, spreadOverMonths: 1, startPeriodId: "2026-11" });
  console.log("DaysOfPay 5 amount:", days5.j.amount, "months:", days5.j.plan.months, "dayRate:", days5.j.dayRate);
  const month = await call("POST", "/penalties/preview", { employeeId: "emp-011", penaltyType: "OneMonthSalary", spreadOverMonths: 1, startPeriodId: "2026-11" });
  console.log("OneMonthSalary:", month.j.amount, "→", month.j.plan.months, "months:", month.j.plan.rows.map((r) => r.amount).join("/"), "cap", month.j.cap, "auto", month.j.plan.autoSpread);
  show("create without decision ref → P-10", await call("POST", "/penalties", { employeeId: "emp-011", penaltyType: "FixedAmount", value: 1000, reason: "x", decisionDate: "2026-10-06", spreadOverMonths: 1, startPeriodId: "2026-11" }));
  show("create for emp-020 (no comp) → P-12", await call("POST", "/penalties", { employeeId: "emp-020", penaltyType: "FixedAmount", value: 1000, reason: "x", decisionRef: "D-1", decisionDate: "2026-10-06", spreadOverMonths: 1, startPeriodId: "2026-11" }));
  const created = await call("POST", "/penalties", { employeeId: "emp-012", penaltyType: "OneMonthSalary", reason: "مخالفة", decisionRef: "DISC-2026-099", decisionDate: "2026-10-06", spreadOverMonths: 1, startPeriodId: "2026-11" }, "hrManager");
  show("create OneMonthSalary emp-012", created);
  console.log("  months:", created.j.spreadOverMonths, "amount:", created.j.computedAmount, "auto:", created.j.autoSpread);
  show("officer approves → 403", await call("POST", `/penalties/${created.j.id}/transition`, { action: "approve" }, "payrollOfficer"));
  const ap = await call("POST", `/penalties/${created.j.id}/transition`, { action: "approve" }, "hrManager");
  show("hr approves", ap);
  const det = await call("GET", `/penalties/${created.j.id}`);
  console.log("  instalments:", det.j.installments.map((i) => `${i.duePeriodId}:${i.amount}`).join(" "));
  show("cancel approved (hr)", await call("POST", `/penalties/${created.j.id}/transition`, { action: "cancel" }, "hrManager"));
  show("cancel Applying (PEN-0002) → 409", await call("POST", "/penalties/pen-0002/transition", { action: "cancel" }, "hrManager"));
  const sum = await call("GET", "/penalties/summary");
  console.log("summary:", JSON.stringify(sum.j));
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
})();
