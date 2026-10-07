import { MockApiError } from "@/lib/mock-api";
import { actorFrom, assertValid, CONFIG_FILES } from "@/lib/payroll/config-server";
import {
  compensationStatus,
  validateCompensation,
  type CompensationDraft,
} from "@/lib/payroll/compensation-validation";
import { dayBefore } from "@/lib/payroll/config-validation";
import { computeCompensationPreview, type ConfigBundle, type PreviewResult } from "@/lib/payroll/preview";
import { collection, insertItem, updateItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  CompensationActivity,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  GovtGradeScale,
  LocalizedText,
  PayrollComponent,
  PayrollProfile,
  PayrollSettings,
  PensionConfiguration,
  SalaryStructure,
  SocialSecurityConfiguration,
  TaxConfiguration,
} from "@/lib/payroll/types";

// Server-only helpers for the compensation Route Handlers.

export const COMP_FILES = {
  compensations: "payroll/compensations.json",
  overrides: "payroll/compensation-components.json",
  activity: "payroll/compensation-activity-log.json",
  settings: "payroll/settings.json",
  employees: "hr/employees.json",
  importSample: "payroll/compensation-import-sample.json",
} as const;

export async function loadBundle(): Promise<ConfigBundle> {
  const [components, structures, profiles, gradeScales, taxConfigs, pensionConfigs, socialSecurityConfigs] =
    await Promise.all([
      collection<PayrollComponent>(CONFIG_FILES.components),
      collection<SalaryStructure>(CONFIG_FILES.structures),
      collection<PayrollProfile>(CONFIG_FILES.profiles),
      collection<GovtGradeScale>(CONFIG_FILES.gradeScales),
      collection<TaxConfiguration>(CONFIG_FILES.tax),
      collection<PensionConfiguration>(CONFIG_FILES.pension),
      collection<SocialSecurityConfiguration>(CONFIG_FILES.socialSecurity),
    ]);
  return { components, structures, profiles, gradeScales, taxConfigs, pensionConfigs, socialSecurityConfigs };
}

export async function minimumWage(): Promise<number> {
  const settings = await collection<PayrollSettings>(COMP_FILES.settings);
  return settings[0]?.minimumWage ?? 350000;
}

export async function findEmployee(employeeId: string): Promise<Employee> {
  const employee = (await collection<Employee>(COMP_FILES.employees)).find((e) => e.id === employeeId);
  if (!employee) throw new MockApiError(404, `Employee ${employeeId} not found`);
  return employee;
}

export type CompensationWithStatus = EmployeeCompensation & {
  status: ReturnType<typeof compensationStatus>;
  overrides: EmployeeCompensationComponent[];
};

/** All records of an employee, newest first, each with derived status and its overrides. */
export async function recordsOf(employeeId: string): Promise<CompensationWithStatus[]> {
  const [records, overrides] = await Promise.all([
    collection<EmployeeCompensation>(COMP_FILES.compensations),
    collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
  ]);
  return records
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
    .map((r) => ({
      ...r,
      status: compensationStatus(r),
      overrides: overrides.filter((o) => o.compensationId === r.id),
    }));
}

export function previewOf(record: CompensationWithStatus, bundle: ConfigBundle): PreviewResult {
  return computeCompensationPreview(
    {
      profileId: record.profileId,
      salaryStructureId: record.salaryStructureId,
      gradeStepId: record.gradeStepId,
      baseSalary: record.baseSalary,
      taxMaritalStatus: record.taxMaritalStatus,
      eligibleChildrenCount: record.eligibleChildrenCount,
      isPensionExempt: record.isPensionExempt,
      overrides: record.overrides,
    },
    bundle
  );
}

export async function appendCompensationActivity(
  request: Request,
  entry: Pick<CompensationActivity, "employeeId" | "compensationId" | "action" | "summary"> & {
    changes?: CompensationActivity["changes"];
  }
) {
  const log = await collection<CompensationActivity>(COMP_FILES.activity);
  return insertItem<CompensationActivity>(COMP_FILES.activity, {
    id: `cl-${String(log.length + 1).padStart(3, "0")}-${Date.now().toString(36)}`,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    changes: null,
    ...entry,
  });
}

export type AssignBody = CompensationDraft & {
  costCenterId?: string | null;
  projectId?: string | null;
  isPensionExempt?: boolean;
  changeReason?: string | null;
};

/**
 * Validates and creates a new compensation record for an employee, closing the previous open one the day
 * before it starts (E-1). Shared by "assign new salary", the annual-increment and promotion tools.
 */
export async function createCompensation(
  request: Request,
  employeeId: string,
  body: AssignBody,
  activity: { action: CompensationActivity["action"]; summary: LocalizedText; changes?: CompensationActivity["changes"] }
): Promise<CompensationWithStatus> {
  await findEmployee(employeeId);
  const [bundle, existing, wage] = await Promise.all([loadBundle(), recordsOf(employeeId), minimumWage()]);

  assertValid(
    validateCompensation(body, {
      profile: bundle.profiles.find((p) => p.id === body.profileId),
      structure: bundle.structures.find((s) => s.id === body.salaryStructureId),
      components: bundle.components,
      employeeRecords: existing,
      validGradeStepIds: new Set(bundle.gradeScales.flatMap((s) => s.steps.map((x) => x.id))),
      minimumWage: wage,
    })
  );

  const actor = actorFrom(request);
  const current = existing.find((r) => r.effectiveTo == null || r.effectiveTo >= body.effectiveFrom);
  if (current) {
    await updateItem<EmployeeCompensation>(COMP_FILES.compensations, current.id, {
      effectiveTo: dayBefore(body.effectiveFrom),
    });
  }

  const id = `ec-${employeeId.slice(4)}-${Date.now().toString(36)}`;
  const created: EmployeeCompensation = {
    id,
    employeeId,
    profileId: body.profileId,
    salaryStructureId: body.salaryStructureId,
    effectiveFrom: body.effectiveFrom,
    effectiveTo: null,
    currencyCode: "IQD",
    paymentMethod: body.paymentMethod,
    bankAccountNo: body.paymentMethod === "Bank" ? (body.bankAccountNo?.trim() ?? null) : null,
    costCenterId: body.costCenterId ?? current?.costCenterId ?? null,
    projectId: body.projectId ?? current?.projectId ?? null,
    gradeStepId: body.gradeStepId,
    baseSalary: body.baseSalary,
    taxMaritalStatus: body.taxMaritalStatus,
    eligibleChildrenCount: body.eligibleChildrenCount,
    isPensionExempt: body.isPensionExempt ?? false,
    changeReason: body.changeReason ?? null,
    createdBy: actor.role,
    createdAt: new Date().toISOString(),
  };
  await insertItem(COMP_FILES.compensations, created);
  for (const [i, o] of body.overrides.entries()) {
    await insertItem<EmployeeCompensationComponent>(COMP_FILES.overrides, {
      id: `${id}-o${i + 1}`,
      compensationId: id,
      componentId: o.componentId,
      amount: o.amount ?? null,
      percent: o.percent ?? null,
    });
  }
  await appendCompensationActivity(request, {
    employeeId,
    compensationId: id,
    action: activity.action,
    summary: activity.summary,
    changes: activity.changes ?? null,
  });

  return { ...created, status: compensationStatus(created), overrides: body.overrides as EmployeeCompensationComponent[] };
}
