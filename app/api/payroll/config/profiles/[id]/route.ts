import { MockApiError, mockResponse } from "@/lib/mock-api";
import {
  appendActivity,
  assertValid,
  CONFIG_FILES,
  diffFields,
  readJson,
} from "@/lib/payroll/config-server";
import { validateProfile } from "@/lib/payroll/config-validation";
import { collection, updateItem } from "@/lib/payroll/store";
import type { PayrollProfile } from "@/lib/payroll/types";

type Params = { params: Promise<{ id: string }> };

const TRACKED: (keyof PayrollProfile)[] = [
  "enablePension", "enableSocialSecurity", "enableIncomeTax", "payFrequency", "roundingRule", "cutoffDay",
  "overtimeMultiplierNormal", "overtimeMultiplierRest", "overtimeMultiplierHoliday", "dayRateBasis", "isActive",
];
const POLICY_FIELDS = [
  "graceMinutes", "latenessMethod", "latenessTiers", "latenessRatePerMinute", "maxLateEventsBeforeDayCut",
  "absenceDayRateComponentCodes", "maxMonthlyDeductionPercent", "overBreachAction",
] as const;

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const item = (await collection<PayrollProfile>(CONFIG_FILES.profiles)).find((p) => p.id === id);
    if (!item) throw new MockApiError(404, `Profile ${id} not found`);
    return item;
  });
}

// The code (GOVERNMENT_IQ / PRIVATE_IQ) is fixed; everything else is editable and validated (C-4…C-8, C-13).
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const before = (await collection<PayrollProfile>(CONFIG_FILES.profiles)).find((p) => p.id === id);
    if (!before) throw new MockApiError(404, `Profile ${id} not found`);

    const patch = await readJson<Partial<PayrollProfile>>(request);
    const merged: PayrollProfile = {
      ...before,
      ...patch,
      id,
      code: before.code,
      attendancePenaltyPolicy: { ...before.attendancePenaltyPolicy, ...patch.attendancePenaltyPolicy },
    };
    assertValid(validateProfile(merged));

    const after = (await updateItem<PayrollProfile>(CONFIG_FILES.profiles, id, {
      ...merged,
      updatedAt: new Date().toISOString(),
    }))!;

    const changes = [
      ...diffFields(before, after, TRACKED),
      ...diffFields(before.attendancePenaltyPolicy, after.attendancePenaltyPolicy, [...POLICY_FIELDS]).map((c) => ({
        ...c,
        field: `attendancePenaltyPolicy.${c.field}`,
      })),
    ];
    if (changes.length > 0) {
      await appendActivity(request, {
        entityType: "profile",
        entityId: id,
        action: "Updated",
        summary: { ar: `تعديل الملف ${after.code} (${changes.length} حقل)`, en: `Profile ${after.code} updated (${changes.length} field(s))` },
        changes,
      });
    }
    return after;
  });
}
