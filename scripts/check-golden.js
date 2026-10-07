// Offline check of the calculation engine against study examples 12.1 – 12.4 (no dev server needed).
// Run: node scripts/check-golden.js
const { root } = require("./ts-register");
const path = require("path");
const read = (f) => require(path.join(root, "mock-data", f));
const { runGolden } = require("../lib/payroll/__golden__/golden.ts");

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
  compensations: read("payroll/compensations.json"),
  overrides: read("payroll/compensation-components.json"),
  accounts: read("payroll/gl-accounts.json"),
};

let failed = 0;
for (const s of runGolden(data)) {
  console.log(`\n${s.id} ${s.title.en}  ${s.passed ? "PASS" : "FAIL"}`);
  for (const c of s.checks) {
    if (c.status === "fail") failed++;
    const study = c.study === null ? "      —" : String(c.study).padStart(9);
    console.log(`  ${c.status.padEnd(10)} ${c.label.en.padEnd(42)} study ${study} | expected ${String(c.expected).padStart(9)} | engine ${String(c.actual).padStart(9)}`);
  }
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll golden checks pass (documented gaps G2/G3 noted above)");
process.exit(failed ? 1 : 0);
