// Smoke check of the compensation API against the study's golden examples. Needs `npm run dev` running.
// Run: node scripts/check-compensation-api.js
const B = "http://localhost:3000/api/payroll";
const get = (p) => fetch(B + p).then((r) => r.json());

(async () => {
  for (const [id, label] of [["emp-007", "12.1 government"], ["emp-008", "12.2 private"]]) {
    const { preview: p } = await get(`/compensations/${id}`);
    console.log(label, {
      gross: p.gross, base: p.pensionableBase, insurance: p.employeeStatutory, taxable: p.taxableBase,
      tax: p.incomeTax, net: p.net, employerCost: p.employerCost,
    });
    console.log("  ", p.lines.map((l) => `${l.componentCode}=${l.amount}`).join(", "));
  }
  const rows = await get("/compensations");
  console.log(rows.length, "rows; missing:", rows.filter((r) => r.missing).map((r) => r.employee.id),
    "below min:", rows.filter((r) => r.belowMinimum).map((r) => r.employee.id));
  const s = await get("/compensations/summary");
  console.log("summary:", { withSalary: s.withSalary, payable: s.payableEmployees, byProfile: s.byProfile.map((x) => [x.code, x.count, x.averageGross]), changes30: s.changesLast30Days });
})();
