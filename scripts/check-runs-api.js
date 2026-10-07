// Smoke check of the payroll-cycle API: periods, inputs, runs, state machine, posting, payment and reversal.
// Needs `npm run dev`. Run: node scripts/check-runs-api.js
const B = "http://localhost:3000/api/payroll";
const call = async (method, p, body, role) => {
  const r = await fetch(B + p, { method, headers: { "content-type": "application/json", ...(role ? { "x-mock-role": role } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, j: await r.json() };
};
const rule = (r) => (r.j.details ? Object.values(r.j.details).map((d) => d.rule).join(",") : "");
let failures = 0;
const expect = (label, r, status, extra) => {
  const ok = r.status === status && (extra ? extra(r.j) : true);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(58)} ${r.status}${r.j.error ? ` ${r.j.error} ${rule(r)}` : ""}`);
};
const t = (cond, label) => { if (!cond) failures++; console.log(`${cond ? "ok  " : "FAIL"} ${label}`); };

(async () => {
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });

  const list = await call("GET", "/runs");
  const byStatus = Object.fromEntries(list.j.map((r) => [r.status, 0]));
  list.j.forEach((r) => byStatus[r.status]++);
  console.log("runs by status:", JSON.stringify(byStatus));
  t(["Draft", "Calculated", "PendingApproval", "Approved", "Posted", "Paid", "Reversed"].every((s) => byStatus[s] > 0), "all seven statuses are seeded");

  // R-1: a second regular run for the same profile / period / scope
  expect("R-1 second regular run on Oct gov → 422", await call("POST", "/runs", { profileId: "pf-gov", payrollPeriodId: "pp-2026-10-gov", runType: "Regular", scopeFilter: {} }, "payrollOfficer"), 422);
  expect("R-1 run on a closed period → 422", await call("POST", "/runs", { profileId: "pf-gov", payrollPeriodId: "pp-2026-08-gov", runType: "Regular", scopeFilter: {} }, "payrollOfficer"), 422);
  expect("hr creates a run → 403", await call("POST", "/runs", { profileId: "pf-gov", payrollPeriodId: "pp-2026-10-gov", runType: "Bonus", scopeFilter: { employeeIds: ["emp-001"] } }, "hrManager"), 403);
  expect("period R-14 duplicate → 422", await call("POST", "/periods", { profileId: "pf-gov", year: 2026, month: 10 }, "payrollOfficer"), 422);

  // ── recalculate the Oct government run (study example 12.1 = emp-007) ───────────────────────────
  expect("finance recalculates → 403", await call("POST", "/runs/run-2026-10-gov/transition", { action: "recalculate" }, "financeAccountant"), 403);
  const recalc = await call("POST", "/runs/run-2026-10-gov/transition", { action: "recalculate" }, "payrollOfficer");
  expect("officer recalculates Oct gov", recalc, 200, (j) => j.run.status === "Calculated");
  const det = await call("GET", "/runs/run-2026-10-gov");
  const p007 = det.j.payslips.find((p) => p.employeeId === "emp-007");
  console.log("  12.1 emp-007:", { gross: p007.grossEarnings, pensionBase: p007.pensionableBase, taxBase: p007.taxableBase, tax: p007.incomeTax, ded: p007.totalEmployeeDeductions, net: p007.netPay, employerCost: p007.employerCost });
  t(p007.grossEarnings === 920000 && p007.pensionableBase === 710000 && p007.taxableBase === 789000 && p007.employerCost === 1026500, "emp-007 matches example 12.1 (except tax, G2)");
  const pick = det.j.run.warnings.filter((w) => w.code !== "NO_COMPENSATION");
  console.log("  run totals:", { employees: det.j.run.employeeCount, gross: det.j.run.grossTotal, net: det.j.run.netTotal, warnings: pick.map((w) => w.code) });

  // ── Calculated → PendingApproval → Approved → Posted → Paid ─────────────────────────────────────
  expect("hr submits → 403 (needs update)", await call("POST", "/runs/run-2026-10-gov/transition", { action: "submit" }, "hrManager"), 403);
  expect("officer submits", await call("POST", "/runs/run-2026-10-gov/transition", { action: "submit" }, "payrollOfficer"), 200, (j) => j.run.status === "PendingApproval");
  expect("officer approves → 403", await call("POST", "/runs/run-2026-10-gov/transition", { action: "approve" }, "payrollOfficer"), 403);
  expect("hr rejects without reason → 422", await call("POST", "/runs/run-2026-10-gov/transition", { action: "reject" }, "hrManager"), 422);
  expect("hr rejects with reason → Calculated", await call("POST", "/runs/run-2026-10-gov/transition", { action: "reject", reason: "مراجعة الأرقام" }, "hrManager"), 200, (j) => j.run.status === "Calculated");
  await call("POST", "/runs/run-2026-10-gov/transition", { action: "submit" }, "payrollOfficer");
  expect("hr approves", await call("POST", "/runs/run-2026-10-gov/transition", { action: "approve" }, "hrManager"), 200, (j) => j.run.status === "Approved");
  const periods = await call("GET", "/periods?profileId=pf-gov");
  t(periods.j.find((p) => p.id === "pp-2026-10-gov").status === "Locked", "approving locks the period");
  expect("approved run cannot be recalculated → 409", await call("POST", "/runs/run-2026-10-gov/transition", { action: "recalculate" }, "payrollOfficer"), 409);
  expect("hr posts → 403", await call("POST", "/runs/run-2026-10-gov/transition", { action: "post" }, "hrManager"), 403);

  const loanBefore = (await call("GET", "/loans/ln-0001")).j;
  const prev = await call("POST", "/runs/run-2026-10-gov/transition", { action: "previewPosting" });
  t(prev.j.balance.every((b) => b.balanced), `posting preview is balanced per cost centre (${prev.j.balance.length} centres, ref ${prev.j.journalRef})`);
  const posted = await call("POST", "/runs/run-2026-10-gov/transition", { action: "post" }, "financeAccountant");
  expect("finance posts", posted, 200, (j) => j.run.status === "Posted" && /^JV-PAYRUN-/.test(j.run.journalRef));
  const loanAfter = (await call("GET", "/loans/ln-0001")).j;
  console.log("  LN-0001 balance:", loanBefore.loan.outstandingBalance, "→", loanAfter.loan.outstandingBalance, "| status", loanAfter.loan.status);
  t(loanBefore.loan.outstandingBalance - loanAfter.loan.outstandingBalance === 100000, "R-7 loan instalment deducted and balance reduced by 100,000");
  const pen = (await call("GET", "/penalties/pen-0003")).j;
  console.log("  PEN-0003 status:", pen.penalty.status);

  expect("finance pays", await call("POST", "/runs/run-2026-10-gov/transition", { action: "pay" }, "financeAccountant"), 200, (j) => j.run.status === "Paid");
  expect("paid run cannot be reversed → 409", await call("POST", "/runs/run-2026-10-gov/transition", { action: "reverse", reason: "x" }, "financeAccountant"), 409);
  t((await call("GET", "/periods?profileId=pf-gov")).j.find((p) => p.id === "pp-2026-10-gov").status === "Closed", "paying closes the period");

  // ── reverse the posted Sep private run: loan instalments go back to Pending ─────────────────────
  const loan2Before = (await call("GET", "/loans/ln-0002")).j;
  expect("reverse without reason → 422", await call("POST", "/runs/run-2026-09-priv/transition", { action: "reverse" }, "financeAccountant"), 422);
  expect("hr reverses → 403", await call("POST", "/runs/run-2026-09-priv/transition", { action: "reverse", reason: "x" }, "hrManager"), 403);
  expect("finance reverses Sep priv", await call("POST", "/runs/run-2026-09-priv/transition", { action: "reverse", reason: "خطأ بالحضور" }, "financeAccountant"), 200, (j) => j.run.status === "Reversed");
  const loan2After = (await call("GET", "/loans/ln-0002")).j;
  console.log("  LN-0002 balance:", loan2Before.loan.outstandingBalance, "→", loan2After.loan.outstandingBalance, "| Sep instalment:", loan2After.installments.find((i) => i.duePeriodId === "2026-09")?.status);
  t(loan2After.installments.find((i) => i.duePeriodId === "2026-09")?.status === "Pending", "R-8 September instalment is Pending again");
  t((await call("GET", "/periods?profileId=pf-priv")).j.find((p) => p.id === "pp-2026-09-priv").status === "Open", "R-8 period re-opened");
  const jr = (await call("GET", "/runs/run-2026-09-priv")).j.journal;
  t(jr.reversal.length === jr.posting.length && jr.reversal.every((l, i) => l.debit === jr.posting[i].credit), "reversal journal mirrors the posting entry");

  // ── a brand-new period and run (R-1, inputs, scope) ─────────────────────────────────────────────
  expect("new period 2026-11 gov", await call("POST", "/periods", { profileId: "pf-gov", year: 2026, month: 11 }, "payrollOfficer"), 201);
  expect("input without reason → 422", await call("POST", "/inputs", { periodKey: "2026-11", employeeId: "emp-007", componentId: "pc-20", amount: 100000 }, "payrollOfficer"), 422);
  expect("input", await call("POST", "/inputs", { periodKey: "2026-11", employeeId: "emp-007", componentId: "pc-20", amount: 100000, reason: "مكافأة" }, "payrollOfficer"), 201);
  const created = await call("POST", "/runs", { profileId: "pf-gov", payrollPeriodId: "pp-2026-11-gov", runType: "Regular", scopeFilter: { departments: ["قسم الهندسة والمشاريع"] } }, "payrollOfficer");
  expect("create regular run (department scope)", created, 201, (j) => j.status === "Draft");
  const calc = await call("POST", `/runs/${created.j.id}/transition`, { action: "calculate" }, "payrollOfficer");
  expect("calculate it", calc, 200, (j) => j.run.status === "Calculated");
  const newDet = (await call("GET", `/runs/${created.j.id}`)).j;
  console.log("  new run:", newDet.run.employeeCount, "payslips,", newDet.claimedInputs, "input(s) claimed, net", newDet.run.netTotal);
  const ps = newDet.payslips.find((p) => p.employeeId === "emp-007");
  const psDet = await call("GET", `/runs/${created.j.id}/payslips/${ps.id}`);
  expect("payslip detail", psDet, 200, (j) => j.lines.length > 5 && j.payslip.trace.length >= 8);
  expect("delete the Calculated run", await call("POST", `/runs/${created.j.id}/transition`, { action: "delete" }, "payrollOfficer"), 200);
  t((await call("GET", "/inputs?periodKey=2026-11")).j.rows[0].appliedRunId === null, "deleting a run releases its inputs");

  // ── net protection: a court order bigger than the monthly cap is carried to the next month ─────
  expect("big court-order input (Nov)", await call("POST", "/inputs", { periodKey: "2026-11", employeeId: "emp-007", componentId: "pc-29", amount: 5000000, reason: "حجز قضائي" }, "payrollOfficer"), 201);
  const np = await call("POST", "/runs", { profileId: "pf-gov", payrollPeriodId: "pp-2026-11-gov", runType: "Regular", scopeFilter: { employeeIds: ["emp-007"] } }, "payrollOfficer");
  expect("net-protection run created", np, 201);
  await call("POST", `/runs/${np.j.id}/transition`, { action: "calculate" }, "payrollOfficer");
  const npDet = (await call("GET", `/runs/${np.j.id}`)).j;
  const npSlip = npDet.payslips[0];
  const flags = npDet.run.warnings.map((w) => w.code).join(",");
  console.log("  emp-007 Nov: gross", npSlip.grossPay, "ded", npSlip.totalEmployeeDeductions, "net", npSlip.netPay, "flag", npSlip.netProtectionFlag, "| warnings", flags);
  t(npSlip.netProtectionFlag === "Spread" && npSlip.totalEmployeeDeductions - npSlip.incomeTax - npSlip.pensionableBase * 0.1 <= Math.round(npSlip.grossPay * 0.25) + 1, "AutoSpread keeps the other deductions within 25% of gross pay");
  t(npDet.schedule.some((x) => x.deferredAmount > 0), "the cap defers part of the scheduled deductions");
  await call("POST", `/runs/${np.j.id}/transition`, { action: "submit" }, "payrollOfficer");
  await call("POST", `/runs/${np.j.id}/transition`, { action: "approve" }, "hrManager");
  await call("POST", `/runs/${np.j.id}/transition`, { action: "post" }, "financeAccountant");
  const inputsAfterPost = (await call("GET", "/inputs?employeeId=emp-007")).j.rows.filter((i) => i.reason.startsWith("حجز"));
  console.log("  inputs after post:", inputsAfterPost.map((i) => `${i.periodKey}:${i.amount}:${i.status}`).join(" | "));
  t(inputsAfterPost.some((i) => i.periodKey === "2026-12" && i.status === "Pending"), "the remainder of the court order moved to December as a pending input");
  expect("reverse the net-protection run", await call("POST", `/runs/${np.j.id}/transition`, { action: "reverse", reason: "اختبار" }, "financeAccountant"), 200);
  const inputsAfterReverse = (await call("GET", "/inputs?employeeId=emp-007")).j.rows.filter((i) => i.reason.startsWith("حجز"));
  console.log("  inputs after reverse:", inputsAfterReverse.map((i) => `${i.periodKey}:${i.amount}:${i.status}`).join(" | "));
  t(inputsAfterReverse.length === 1 && inputsAfterReverse[0].amount === 5000000 && inputsAfterReverse[0].status === "Pending", "reversal restores the original input and drops the carried remainder");

  const sum = await call("GET", "/runs/summary");
  console.log("summary:", JSON.stringify({ current: sum.j.current, waiting: sum.j.waiting, mix: sum.j.deductionMix, netProtection: sum.j.netProtection, pendingInputs: sum.j.pendingInputs }));
  const gold = await call("GET", "/golden");
  t(gold.j.passed, "golden examples pass through the API");

  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll API checks passed");
  process.exit(failures ? 1 : 0);
})();
