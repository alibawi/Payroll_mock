import { MockApiError, mockResponse } from "@/lib/mock-api";
import {
  appendActivity,
  assertValid,
  CONFIG_FILES,
  readJson,
} from "@/lib/payroll/config-server";
import {
  dayBefore,
  effectiveStatus,
  validateBrackets,
  validateEffectiveFrom,
} from "@/lib/payroll/config-validation";
import { collection, insertItem, updateItem } from "@/lib/payroll/store";
import type {
  ConfigEntityType,
  EffectiveDated,
  FieldErrors,
  PensionConfiguration,
  SocialSecurityConfiguration,
  TaxConfiguration,
} from "@/lib/payroll/types";

// Generic handlers for the three effective-dated configuration entities (tax / pension / social
// security). A change is always a NEW record with a later effectiveFrom; the previous open record is
// auto-closed the day before (C-9 / spec §3). Routes just bind one kind: `export const { GET, POST } = …`.

type Kind = "tax" | "pension" | "socialSecurity";

const FILES: Record<Kind, string> = {
  tax: CONFIG_FILES.tax,
  pension: CONFIG_FILES.pension,
  socialSecurity: CONFIG_FILES.socialSecurity,
};
const ENTITY_TYPE: Record<Kind, ConfigEntityType> = { tax: "tax", pension: "pension", socialSecurity: "socialSecurity" };
const ID_PREFIX: Record<Kind, string> = { tax: "tx", pension: "pn", socialSecurity: "ss" };
const LABEL: Record<Kind, { ar: string; en: string }> = {
  tax: { ar: "إعدادات الضريبة", en: "Tax settings" },
  pension: { ar: "نسب التقاعد", en: "Pension rates" },
  socialSecurity: { ar: "نسب الضمان", en: "Social-security rates" },
};

type Config = EffectiveDated & Record<string, unknown>;

function rateErrors(input: Partial<PensionConfiguration | SocialSecurityConfiguration>): FieldErrors {
  const errors: FieldErrors = {};
  const check = (key: "employeeRate" | "employerRate") => {
    const v = input[key];
    if (typeof v !== "number" || v < 0 || v > 100) {
      errors[key] = { rule: "C-9", message: { ar: "النسبة بين 0 و100", en: "Rate must be between 0 and 100" } };
    }
  };
  check("employeeRate");
  check("employerRate");
  return errors;
}

export function makeEffectiveHandlers(kind: Kind) {
  const file = FILES[kind];

  async function GET(request: Request) {
    return mockResponse(request, async () => {
      const profileId = new URL(request.url).searchParams.get("profileId");
      const items = await collection<Config>(file);
      return items
        .filter((c) => !profileId || c.profileId === profileId)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
        .map((c) => ({ ...c, status: effectiveStatus(c) }));
    });
  }

  async function POST(request: Request) {
    return mockResponse(
      request,
      async () => {
        const input = await readJson<Partial<Config>>(request);
        if (!input.profileId) throw new MockApiError(422, "profileId is required");
        const items = await collection<Config>(file);
        const sameProfile = items.filter((c) => c.profileId === input.profileId);

        const errors: FieldErrors = validateEffectiveFrom(String(input.effectiveFrom ?? ""), sameProfile);
        if (kind === "tax") {
          Object.assign(errors, validateBrackets((input as Partial<TaxConfiguration>).brackets ?? []));
        } else {
          Object.assign(errors, rateErrors(input as Partial<PensionConfiguration>));
        }
        assertValid(errors);

        // Close the superseded record (the latest one that is still open or overlaps the new start).
        const effectiveFrom = input.effectiveFrom as string;
        const previous = [...sameProfile]
          .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
          .find((c) => c.effectiveTo == null || c.effectiveTo >= effectiveFrom);
        if (previous) {
          await updateItem(file, previous.id, { effectiveTo: dayBefore(effectiveFrom) } as Partial<Config>);
          await appendActivity(request, {
            entityType: ENTITY_TYPE[kind],
            entityId: previous.id,
            action: "Closed",
            summary: {
              ar: `أُغلق السجل تلقائياً بتاريخ ${dayBefore(effectiveFrom)}`,
              en: `Record auto-closed on ${dayBefore(effectiveFrom)}`,
            },
          });
        }

        const created = {
          ...input,
          id: `${ID_PREFIX[kind]}-${Date.now().toString(36)}`,
          effectiveTo: null,
          createdAt: new Date().toISOString(),
        } as Config;
        await insertItem(file, created);
        await appendActivity(request, {
          entityType: ENTITY_TYPE[kind],
          entityId: created.id,
          action: "Created",
          summary: {
            ar: `${LABEL[kind].ar} جديدة تسري من ${effectiveFrom}`,
            en: `New ${LABEL[kind].en.toLowerCase()} effective ${effectiveFrom}`,
          },
        });
        return { ...created, status: effectiveStatus(created) };
      },
      { status: 201 }
    );
  }

  return { GET, POST };
}
