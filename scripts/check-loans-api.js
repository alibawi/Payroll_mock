// Smoke check of the loans API state machine. Needs `npm run dev`. Resets the store first.
// Run: node scripts/check-loans-api.js
const B = "http://localhost:3000/api/payroll";
const call = async (method, p, body, role) => {
  const r = await fetch(B + p, {
    method,
    headers: { "content-type": "application/json", ...(role ? { "x-mock-role": role } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  return { status: r.status, j };
};
const show = (label, r) => console.log(label.padEnd(44), r.status, r.j.error ? `${r.j.error} ${JSON.stringify(Object.values(r.j.details ?? {}).map((d) => d.rule))}` : "");

(async () => {
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
  const draft = { employeeId: "emp-004", loanType: "PersonalLoan", principal: 1000000, installmentCount: 6, interestType: "None", firstDeductionPeriodId: "2026-11", reason: "قرض شخصي" };

  show("advance while one is open (emp-011) → L-12", await call("POST", "/loans", { ...draft, employeeId: "emp-011", loanType: "SalaryAdvance", installmentCount: 1 }));
  const created = await call("POST", "/loans", draft);
  show("create draft emp-004", created);
  const id = created.j.id;
  const noComp = await call("POST", "/loans", { ...draft, employeeId: "emp-020" });
  show("create for emp-020 (no compensation)", noComp);
  if (noComp.status === 201) show("  submit → L-1", await call("POST", `/loans/${noComp.j.id}/transition`, { action: "submit" }));
  show("employee role requests for someone else", await call("POST", "/loans", draft, "employee"));
  show("submit", await call("POST", `/loans/${id}/transition`, { action: "submit" }, "payrollOfficer"));
  show("officer approves → 403", await call("POST", `/loans/${id}/transition`, { action: "approve" }, "payrollOfficer"));
  show("approve (hr)", await call("POST", `/loans/${id}/transition`, { action: "approve" }, "hrManager"));
  const d = await call("GET", `/loans/${id}`);
  console.log("  schedule:", d.j.installments.map((i) => `${i.duePeriodId}:${i.amount}`).join(" "), "| total", d.j.loan.totalRepayable);
  console.log("  cap:", JSON.stringify(d.j.cap));
  show("hr disburses → 403", await call("POST", `/loans/${id}/transition`, { action: "disburse" }, "hrManager"));
  const dis = await call("POST", `/loans/${id}/transition`, { action: "disburse", accountCode: "1120" }, "financeAccountant");
  show("disburse (finance)", dis);
  console.log("  journal:", dis.j.journal.map((l) => `${l.accountCode} Dr${l.debit} Cr${l.credit}`).join(" | "), dis.j.journalRef);
  const settle = await call("POST", "/loans/ln-0002/transition", { action: "earlySettle", source: "Cash" }, "payrollOfficer");
  show("early settle LN-0002 (cash)", settle);
  console.log("  remaining:", settle.j.remaining, "status:", settle.j.loan.status, settle.j.journalRef);
  const l1 = await call("GET", "/loans/ln-0001");
  const pending = l1.j.installments.find((i) => i.status === "Pending");
  show("defer LN-0001 instalment", await call("POST", "/loans/ln-0001/transition", { action: "defer", installmentId: pending.id }, "hrManager"));
  show("waive on Settled loan → 409", await call("POST", "/loans/ln-0004/transition", { action: "waive", installmentId: "x" }, "hrManager"));
  show("reject without reason", await call("POST", "/loans/ln-0006/transition", { action: "reject" }, "hrManager"));
  show("reject with reason", await call("POST", "/loans/ln-0006/transition", { action: "reject", reason: "سقف" }, "hrManager"));
  const s = await call("GET", "/loans/summary");
  console.log("summary:", JSON.stringify(s.j));
  await fetch("http://localhost:3000/api/mock/reset", { method: "POST" });
})();
