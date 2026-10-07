// Smoke check of the module-6 API: report aggregation (T-1/T-2/T-3), remittances and the end-of-service workflow.
// Needs `npm run dev`. Run: node scripts/check-reports-api.js
const B = "http://localhost:3000/api/payroll";
const call = async (method, p, body, role) => {
  const r = await fetch(B + p, { method, headers: { "content-type": "application/json", ...(role ? { "x-mock-role": role } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, j: await r.json() };
};
let failures = 0;
const t = (cond, label) => { if (!cond) failures++; console.log(`${cond ? "ok  " : "FAIL"} ${label}`); };
const expect = (label, r, status, extra) => t(r.status === status && (extra ? extra(r.j) : true), `${label} → ${r.status}${r.j.error ? " " + r.j.error : ""}`);

(async () => {
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });

  const reg = (await call("GET", "/reports/register?periodKey=2026-09")).j;
  const sum = (k) => reg.groups.reduce((s, g) => s + g.totals[k], 0);
  t(reg.count === 17 && !reg.isDraft, `register of Sept: ${reg.count} employees, not draft`);
  t(sum("net") === reg.totals.net && sum("grossEarnings") === reg.totals.grossEarnings, "group totals add up to the grand total");
  const slips = (await call("GET", "/runs/run-2026-09-gov")).j;
  t(reg.groups.flatMap((g) => g.rows).filter((r) => slips.payslips.some((p) => p.id === r.payslipId)).reduce((s, r) => s + r.net, 0) === slips.run.netTotal, "register rows of the gov run add up to the run's net total");
  t((await call("GET", "/reports/register?periodKey=2026-10")).j.isDraft === true, "T-1 an unposted period is flagged as draft");

  const bank = (await call("GET", "/reports/bank-transfer?periodKey=2026-09")).j;
  t(bank.rows.every((r) => r.netPay > 0), `bank file: ${bank.rows.length} transfers, ${bank.total.toLocaleString("en-US")} total, ${bank.cashExcluded} cash excluded (T-3)`);

  for (const kind of ["tax", "pension", "socialSecurity"]) {
    const list = (await call("GET", `/reports/remittances?kind=${kind}`)).j;
    const detail = (await call("GET", `/reports/remittances?kind=${kind}&periodKey=2026-09`)).j;
    const row = list.periods.find((p) => p.periodKey === "2026-09");
    t(detail.consistent && detail.total === row.total, `T-2 ${kind}: statement ${detail.total.toLocaleString("en-US")} = payslip lines, status ${detail.status?.status}`);
  }
  expect("remit Sept tax (finance)", await call("POST", "/reports/remittances", { periodKey: "2026-09", kind: "tax" }, "financeAccountant"), 200, (j) => j.status === "Remitted");
  expect("remit twice → 409", await call("POST", "/reports/remittances", { periodKey: "2026-09", kind: "tax" }, "financeAccountant"), 409);
  expect("employee opens the register → 403", await call("GET", "/reports/register?periodKey=2026-09", null, "employee"), 403);
  expect("deptHead sees only his department", await call("GET", "/reports/register?periodKey=2026-09", null, "deptHead"), 200, (j) => j.groups.length === 1);
  expect("employee opens own payslip", await call("GET", "/reports/payslip/ps-2026-09-emp-007", null, "employee"), 200);
  expect("employee opens another payslip → 403", await call("GET", "/reports/payslip/ps-2026-09-emp-001", null, "employee"), 403);
  const def = (await call("GET", "/reports/deferred-deductions")).j;
  t(def.rows.length > 0 && def.totalDeferred > 0, `deferred deductions report: ${def.rows.length} item(s), ${def.totalDeferred.toLocaleString("en-US")}`);
  const cost = (await call("GET", "/reports/employer-cost?periodKey=2026-09")).j;
  t(cost.series.length === 12 && cost.totals.employerCost === cost.rows.reduce((s, r) => s + r.employerCost, 0), "employer cost: 12-month series, totals add up");
  console.log("  summary:", JSON.stringify((await call("GET", "/reports/summary")).j));

  // ── end of service ──────────────────────────────────────────────────────────────────────────────
  const ctx = (await call("GET", "/end-of-service/context?employeeId=emp-008&terminationDate=2026-12-31&reason=Resignation&leaveDays=10")).j;
  console.log("  emp-008 context:", JSON.stringify({ years: ctx.ctx.serviceYears, wage: ctx.ctx.lastWage, ...ctx.result }));
  const expectedGratuity = Math.round((ctx.ctx.lastWage * 7 / 30 * 2 * ctx.ctx.serviceYears) / 250) * 250;
  t(ctx.result.gratuityAmount === expectedGratuity, "T-4/T-7 gratuity = two weeks' wage × years (rounded to 250)");
  const disc = (await call("GET", "/end-of-service/context?employeeId=emp-008&terminationDate=2026-12-31&reason=DismissalDisciplinary&leaveDays=10")).j;
  t(disc.result.gratuityAmount === 0 && disc.result.accruedLeavePay > 0, "T-6 no gratuity for a disciplinary dismissal, leave pay still due");
  t((await call("GET", "/end-of-service/context?employeeId=emp-007&terminationDate=2026-12-31")).j.result === null, "T-8 government employee is not calculated");
  expect("create for a government employee → 422", await call("POST", "/end-of-service", { employeeId: "emp-007", terminationDate: "2026-12-31", terminationReason: "Resignation" }, "payrollOfficer"), 422);
  const created = await call("POST", "/end-of-service", { employeeId: "emp-008", terminationDate: "2026-12-31", terminationReason: "Termination", accruedLeaveDays: 10, arbitraryDismissalCompensation: 2000000 }, "payrollOfficer");
  expect("create claim", created, 201, (j) => j.status === "Draft" && j.totalAmount === j.gratuityAmount + j.accruedLeavePay + 2000000);
  expect("duplicate → 422 (T-9)", await call("POST", "/end-of-service", { employeeId: "emp-008", terminationDate: "2026-12-31", terminationReason: "Resignation" }, "payrollOfficer"), 422);
  const id = created.j.id;
  expect("officer approves → 403", await call("POST", `/end-of-service/${id}/transition`, { action: "approve" }, "payrollOfficer"), 403);
  expect("pay a draft → 409", await call("POST", `/end-of-service/${id}/transition`, { action: "pay" }, "financeAccountant"), 409);
  expect("hr approves", await call("POST", `/end-of-service/${id}/transition`, { action: "approve" }, "hrManager"), 200, (j) => j.eos.status === "Approved");
  expect("edit after approval → 409", await call("PATCH", `/end-of-service/${id}`, { accruedLeaveDays: 1 }, "payrollOfficer"), 409);
  const prev = await call("POST", `/end-of-service/${id}/transition`, { action: "previewJournal" }, "financeAccountant");
  t(prev.j.journal.reduce((s, l) => s + l.debit, 0) === created.j.totalAmount && prev.j.journal.reduce((s, l) => s + l.credit, 0) === created.j.totalAmount, "payment journal preview is balanced");
  expect("finance pays", await call("POST", `/end-of-service/${id}/transition`, { action: "pay" }, "financeAccountant"), 200, (j) => j.eos.status === "Paid" && /^PV-EOS-/.test(j.eos.paymentRef));
  expect("cancel a paid claim → 409", await call("POST", `/end-of-service/${id}/transition`, { action: "cancel" }, "hrManager"), 409);

  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll module-6 API checks passed");
  process.exit(failures ? 1 : 0);
})();
