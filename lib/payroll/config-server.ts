import { MockApiError } from "@/lib/mock-api";
import { hasErrors } from "@/lib/payroll/config-validation";
import { collection, insertItem } from "@/lib/payroll/store";
import { structureErrors } from "@/lib/payroll/structure-validation";
import type {
  ConfigActivity,
  ConfigEntityType,
  EffectiveDated,
  FieldErrors,
  LocalizedText,
  PayrollComponent,
  SalaryStructure,
} from "@/lib/payroll/types";

// Server-only helpers shared by the config Route Handlers.

export const CONFIG_FILES = {
  components: "payroll/components.json",
  profiles: "payroll/profiles.json",
  structures: "payroll/structures.json",
  gradeScales: "payroll/grade-scales.json",
  tax: "payroll/tax-configs.json",
  pension: "payroll/pension-configs.json",
  socialSecurity: "payroll/social-security-configs.json",
  glAccounts: "payroll/gl-accounts.json",
  activityLog: "payroll/config-activity-log.json",
} as const;

const ACTORS: Record<string, { name: LocalizedText; role: string }> = {
  hrManager: { name: { ar: "سلمى الكربولي", en: "Salma Al-Karbouli" }, role: "hrManager" },
  payrollOfficer: { name: { ar: "هبة الجبوري", en: "Hiba Al-Jubouri" }, role: "payrollOfficer" },
  financeAccountant: { name: { ar: "محمد العبيدي", en: "Mohammed Al-Obaidi" }, role: "financeAccountant" },
};

/** Acting user for the audit trail — the client sends the mock role in `x-mock-role`. */
export function actorFrom(request: Request) {
  return ACTORS[request.headers.get("x-mock-role") ?? ""] ?? ACTORS.payrollOfficer;
}

export async function appendActivity(
  request: Request,
  entry: Pick<ConfigActivity, "entityType" | "entityId" | "action" | "summary"> & {
    changes?: ConfigActivity["changes"];
  }
) {
  const log = await collection<ConfigActivity>(CONFIG_FILES.activityLog);
  const id = `al-${String(log.length + 1).padStart(3, "0")}-${Date.now().toString(36)}`;
  return insertItem<ConfigActivity>(CONFIG_FILES.activityLog, {
    id,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    changes: null,
    ...entry,
  });
}

export function assertValid(errors: FieldErrors) {
  if (hasErrors(errors)) {
    throw new MockApiError(422, "Validation failed", errors);
  }
}

/** Throws HTTP 422 when a salary structure draft breaks a rule (see structure-validation.ts). */
export function validateStructure(
  input: Partial<SalaryStructure>,
  existing: SalaryStructure[],
  components: PayrollComponent[],
  selfId?: string
) {
  assertValid(structureErrors(input, existing, components, selfId));
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new MockApiError(400, "Invalid JSON body");
  }
}

/** Shallow field diff for the audit trail (`from`/`to` rendered as strings). */
export function diffFields<T extends object>(before: T, after: T, fields: (keyof T)[]) {
  const text = (v: unknown) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return fields
    .filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]))
    .map((f) => ({ field: String(f), from: text(before[f]), to: text(after[f]) }));
}

/** Registry used by the generic effective-dated routes (tax / pension / social security). */
export type EffectiveEntity = {
  file: string;
  entityType: ConfigEntityType;
};
export const EFFECTIVE_ENTITIES: Record<"tax" | "pension" | "socialSecurity", EffectiveEntity> = {
  tax: { file: CONFIG_FILES.tax, entityType: "tax" },
  pension: { file: CONFIG_FILES.pension, entityType: "pension" },
  socialSecurity: { file: CONFIG_FILES.socialSecurity, entityType: "socialSecurity" },
};

export type AnyEffective = EffectiveDated & { effectiveTo: string | null };
