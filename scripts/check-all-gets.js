// Sweeps every read endpoint under each of the five mock roles and reports any 5xx (403/404 are expected for some roles).
// Needs `npm run dev`. Run: node scripts/check-all-gets.js
const B = "http://localhost:3000/api";
const roles = [null, "hrManager", "payrollOfficer", "financeAccountant", "deptHead", "employee"];
const paths = [
  "/hr/employees", "/hr/attendance-summary", "/payroll/settings", "/payroll/config/bundle", "/payroll/config/summary", "/payroll/config/components", "/payroll/config/components/pc-01",
  "/payroll/config/profiles", "/payroll/config/structures", "/payroll/config/grade-scales", "/payroll/config/tax-configs", "/payroll/config/pension-configs", "/payroll/config/social-security-configs",
  "/payroll/config/gl-accounts", "/payroll/config/activity-log", "/payroll/compensations", "/payroll/compensations/summary", "/payroll/compensations/emp-007", "/payroll/loans", "/payroll/loans/summary", "/payroll/loans/ln-0001",
  "/payroll/penalties", "/payroll/penalties/summary", "/payroll/penalties/pen-0001", "/payroll/attendance/simulate?employeeId=emp-011&period=2026-09",
  "/payroll/periods", "/payroll/inputs", "/payroll/runs", "/payroll/runs/summary", "/payroll/runs/run-2026-10-gov", "/payroll/runs/run-2026-09-priv", "/payroll/runs/run-2026-07-priv-a", "/payroll/runs/run-2026-10-priv-off",
  "/payroll/runs/run-2026-10-gov/payslips/ps-2026-10-emp-007", "/payroll/my-payslips", "/payroll/golden",
  "/payroll/reports/summary", "/payroll/reports/register?periodKey=2026-09", "/payroll/reports/bank-transfer", "/payroll/reports/remittances?kind=tax", "/payroll/reports/remittances?kind=pension&periodKey=2026-09",
  "/payroll/reports/remittances?kind=socialSecurity&periodKey=2026-09", "/payroll/reports/deferred-deductions", "/payroll/reports/employer-cost", "/payroll/reports/payslip/ps-2026-09-emp-007",
  "/payroll/end-of-service", "/payroll/end-of-service/eos-001", "/payroll/end-of-service/context?employeeId=emp-008&terminationDate=2026-12-31", "/payroll/search?q=ali", "/payroll/notifications",
];
(async () => {
  let bad = 0;
  for (const p of paths) {
    const row = [];
    for (const role of roles) {
      const r = await fetch(B + p, { headers: role ? { "x-mock-role": role } : {} });
      if (r.status >= 500) bad++;
      row.push(r.status);
    }
    console.log(`${row.some((s) => s >= 500) ? "FAIL" : "ok  "} ${row.join(" ")}  ${p}`);
  }
  console.log(bad ? `\n${bad} server error(s)` : "\nNo server errors under any role");
  process.exit(bad ? 1 : 0);
})();
