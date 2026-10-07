import { mockResponse } from "@/lib/mock-api";
import { CONFIG_FILES, assertValid, readJson } from "@/lib/payroll/config-server";
import { appendRunActivity, requirePermission, runRole, RUN_FILES, nextRunNumber } from "@/lib/payroll/run-server";
import { validateRunDraft, type RunDraft } from "@/lib/payroll/runs";
import { collection, insertItem } from "@/lib/payroll/store";
import type { PayrollPeriod, PayrollProfile, PayrollRun, RunRow } from "@/lib/payroll/types";

// GET  /api/payroll/runs?periodKey=&profileId=&status=   → the run list
// POST /api/payroll/runs { profileId, payrollPeriodId, runType, scopeFilter, note? } → a new Draft run (R-1)
export async function GET(request: Request) {
  return mockResponse(request, async () => {
    requirePermission(request, "payroll.run", "view");
    const params = new URL(request.url).searchParams;
    const [runs, profiles] = await Promise.all([collection<PayrollRun>(RUN_FILES.runs), collection<PayrollProfile>(CONFIG_FILES.profiles)]);
    const rows: RunRow[] = runs
      .filter(
        (r) =>
          (!params.get("periodKey") || r.periodKey === params.get("periodKey")) &&
          (!params.get("profileId") || r.profileId === params.get("profileId")) &&
          (!params.get("status") || r.status === params.get("status"))
      )
      .sort((a, b) => b.runNo.localeCompare(a.runNo))
      .map((r) => ({
        ...r,
        warnings: [],
        profileCode: profiles.find((p) => p.id === r.profileId)?.code ?? "PRIVATE_IQ",
        blockerCount: r.warnings.filter((w) => w.severity === "Blocker").length,
        warningCount: r.warnings.filter((w) => w.severity !== "Info").length,
      }));
    return rows;
  });
}

type Body = Partial<RunDraft>;

export async function POST(request: Request) {
  return mockResponse(
    request,
    async () => {
      requirePermission(request, "payroll.run", "create");
      const body = await readJson<Body>(request);
      const [periods, runs] = await Promise.all([collection<PayrollPeriod>(RUN_FILES.periods), collection<PayrollRun>(RUN_FILES.runs)]);
      const period = periods.find((p) => p.id === body.payrollPeriodId);
      const scopeFilter = {
        departments: body.scopeFilter?.departments ?? [],
        costCenters: body.scopeFilter?.costCenters ?? [],
        employeeIds: body.scopeFilter?.employeeIds ?? [],
      };
      assertValid(validateRunDraft({ ...body, scopeFilter }, period, runs));

      const short = period!.id.split("-").pop();
      let id = `run-${period!.periodKey}-${short}${body.runType === "Regular" ? "" : `-${body.runType!.toLowerCase()}`}`;
      for (let n = 2; runs.some((r) => r.id === id); n++) id = `run-${period!.periodKey}-${short}-${body.runType!.toLowerCase()}-${n}`;
      const now = new Date().toISOString();
      const created: PayrollRun = {
        id,
        runNo: await nextRunNumber(),
        profileId: period!.profileId,
        payrollPeriodId: period!.id,
        periodKey: period!.periodKey,
        organizationId: "org-enki",
        runType: body.runType!,
        scopeFilter,
        status: "Draft",
        employeeCount: 0,
        grossTotal: 0,
        deductionTotal: 0,
        netTotal: 0,
        employerCostTotal: 0,
        journalEntryId: null,
        journalRef: null,
        paymentRef: null,
        baseType: "PAYRUN",
        reversalRunId: null,
        reversalReason: null,
        rejectionReason: null,
        warnings: [],
        calculatedAt: null,
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
        postedAt: null,
        paidAt: null,
        reversedAt: null,
        note: body.note?.trim() || null,
        createdBy: runRole(request) ?? "payrollOfficer",
        createdAt: now,
        updatedAt: now,
      };
      await insertItem(RUN_FILES.runs, created);
      // a run created after a reversed one of the same period replaces it
      for (const old of runs.filter((r) => r.payrollPeriodId === period!.id && r.status === "Reversed" && !r.reversalRunId)) {
        old.reversalRunId = created.id;
      }
      await appendRunActivity(request, created.id, "Created", { ar: `إنشاء دورة ${created.runNo}`, en: `Run ${created.runNo} created` });
      return created;
    },
    { status: 201 }
  );
}
