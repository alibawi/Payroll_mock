"use client";

import { Building2, Landmark, Users } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/payroll/component-badges";
import { StatusBadge } from "@/components/status-badge";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon, profileLabels } from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import type { PayrollProfile } from "@/lib/payroll/types";

type ProfileRow = PayrollProfile & { employeeCount: number };

export default function PayProfilesPage() {
  const { t } = useLocale();
  const { data, loading, error, reload } = useApi<ProfileRow[]>("/api/payroll/config/profiles");

  return (
    <div className="space-y-5">
      <PageHeader title={payrollNavLabels.profiles} description={payrollScreenDescriptions.profiles} />

      {loading && <p className="py-12 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
      {error && (
        <p className="py-12 text-center text-sm text-destructive">
          {t(commonLabels.loadError)}{" "}
          <button type="button" onClick={reload} className="underline">
            {t(commonLabels.retry)}
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((profile) => {
          const Icon = profile.code === "GOVERNMENT_IQ" ? Landmark : Building2;
          const policy = profile.attendancePenaltyPolicy;
          return (
            <Link
              key={profile.id}
              href={`/payroll/config/profiles/${profile.id}`}
              className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/25 dark:text-tile-indigo">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{t(profile.name)}</h2>
                    <ActiveBadge active={profile.isActive} />
                  </div>
                  <bdi dir="ltr" className="font-mono text-xs text-muted-foreground">
                    {profile.code}
                  </bdi>
                  <p className="mt-2 text-sm text-muted-foreground">{t(profile.description)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.enablePension && <StatusBadge tone="info" label={t(profileLabels.enablePension)} />}
                {profile.enableSocialSecurity && <StatusBadge tone="info" label={t(profileLabels.enableSocialSecurity)} />}
                {profile.enableIncomeTax && <StatusBadge tone="neutral" label={t(profileLabels.enableIncomeTax)} />}
                <StatusBadge tone="success" label={t(profileLabels.monthly)} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">{t(profileLabels.employees)}</dt>
                  <dd className="flex items-center gap-1 font-medium tabular-nums">
                    <Users className="size-3.5 text-muted-foreground" />
                    {profile.employeeCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t(profileLabels.rounding)}</dt>
                  <dd className="font-medium tabular-nums">{profile.roundingRule}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t(profileLabels.grace)}</dt>
                  <dd className="font-medium tabular-nums">{policy.graceMinutes}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t(profileLabels.deductionCap)}</dt>
                  <dd className="font-medium tabular-nums">{policy.maxMonthlyDeductionPercent}%</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {t(configCommon.lastUpdated)}: <bdi dir="ltr">{formatDate(profile.updatedAt)}</bdi>
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
