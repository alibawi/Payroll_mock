import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { assertValid, CONFIG_FILES, readJson } from "@/lib/payroll/config-server";
import { mockResponse } from "@/lib/mock-api";
import { compensationFor } from "@/lib/payroll/run-calc";
import { requirePermission, RUN_FILES } from "@/lib/payroll/run-server";
import { collection, insertItem } from "@/lib/payroll/store";
import type { EmployeeCompensation, FieldErrors, PayrollInput, PayrollPeriod, PayrollProfile, PayrollRun } from "@/lib/payroll/types";

// GET  /api/payroll/periods?profileId=&year=&status=   → periods with their runs and pending inputs
// POST /api/payroll/periods { profileId, year, month }  → a new monthly period (R-14: one per profile and month)
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.period", "view");
    const params = new URL(request.url).searchParams;
    const [periods, runs, inputs, compensations] = await Promise.all([
      collection<PayrollPeriod>(RUN_FILES.periods),
      collection<PayrollRun>(RUN_FILES.runs),
      collection<PayrollInput>(RUN_FILES.inputs),
      collection<EmployeeCompensation>(COMP_FILES.compensations),
    ]);
    return periods
      .filter(
        (p) =>
          (!params.get("profileId") || p.profileId === params.get("profileId")) &&
          (!params.get("year") || String(p.year) === params.get("year")) &&
          (!params.get("status") || p.status === params.get("status"))
      )
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey) || a.profileId.localeCompare(b.profileId))
      .map((p) => {
        const mine = runs.filter((r) => r.payrollPeriodId === p.id);
        const main = mine.find((r) => r.runType === "Regular" && r.status !== "Reversed") ?? mine.find((r) => r.runType === "Regular");
        return {
          ...p,
          runCount: mine.length,
          pendingInputs: inputs.filter(
            (i) =>
              i.periodKey === p.periodKey &&
              i.status === "Pending" &&
              compensationFor(compensations, i.employeeId, p.startDate, p.endDate)?.profileId === p.profileId
          ).length,
          mainRun: main ? { id: main.id, runNo: main.runNo, status: main.status } : null,
        };
      });
  });
}

type Body = { profileId?: string; year?: number; month?: number };

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requirePermission(request, "payroll.period", "create");
      const body = await readJson<Body>(request);
      const [profiles, periods] = await Promise.all([
        collection<PayrollProfile>(CONFIG_FILES.profiles),
        collection<PayrollPeriod>(RUN_FILES.periods),
      ]);
      const profile = profiles.find((p) => p.id === body.profileId);
      const errors: FieldErrors = {};
      if (!profile) errors.profileId = { rule: "R-0", message: { ar: "الملف مطلوب", en: "Profile is required" } };
      const year = Number(body.year);
      const month = Number(body.month);
      if (!Number.isInteger(year) || year < 2020 || year > 2100) errors.year = { rule: "R-0", message: { ar: "السنة غير صالحة", en: "Invalid year" } };
      if (!Number.isInteger(month) || month < 1 || month > 12) errors.month = { rule: "R-0", message: { ar: "الشهر غير صالح", en: "Invalid month" } };
      assertValid(errors);

      const periodKey = `${year}-${String(month).padStart(2, "0")}`;
      const short = profile!.code === "GOVERNMENT_IQ" ? "gov" : "priv";
      const clash = periods.find((p) => p.profileId === profile!.id && p.periodKey === periodKey);
      if (clash) {
        assertValid({ month: { rule: "R-14", message: { ar: "توجد فترة لنفس الملف والشهر", en: "A period already exists for this profile and month" } } });
      }
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const pad = (n: number) => String(n).padStart(2, "0");
      const created: PayrollPeriod = {
        id: `pp-${periodKey}-${short}`,
        periodKey,
        profileId: profile!.id,
        periodType: "Monthly",
        year,
        sequenceNo: month,
        startDate: `${periodKey}-01`,
        endDate: `${periodKey}-${pad(last)}`,
        cutoffDate: `${periodKey}-${pad(Math.min(profile!.cutoffDay, last))}`,
        payDate: `${periodKey}-${pad(last)}`,
        postingPeriodId: `FP-${periodKey}`,
        status: "Open",
        createdAt: new Date().toISOString(),
      };
      return insertItem(RUN_FILES.periods, created);
    },
    { status: 201 }
  );
}
