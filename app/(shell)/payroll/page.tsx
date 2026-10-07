"use client";

import { CalendarClock, Layers, Layers3, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/components/locale-provider";
import { KPICard } from "@/components/kpi-card";
import { ModuleScreensGrid } from "@/components/module-screens-grid";
import { PageHeader } from "@/components/page-header";
import { AuditTimeline } from "@/components/payroll/audit-timeline";
import { DetailSection } from "@/components/payroll/detail-section";
import { RunDashboard } from "@/components/payroll/run-dashboard";
import { moduleLabels } from "@/lib/i18n/labels";
import { landingLabels } from "@/lib/i18n/payroll-config-labels";
import { payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatDate } from "@/lib/payroll/format";
import type { ConfigActivity, LocalizedText } from "@/lib/payroll/types";

type Summary = {
  activeComponents: number;
  totalComponents: number;
  activeStructures: number;
  topProfile: { name: LocalizedText; count: number } | undefined;
  lastUpdated: { tax: string | null; pension: string | null; socialSecurity: string | null };
  upcomingChanges: number;
  expiringSoon: { kind: "tax" | "pension" | "socialSecurity"; id: string; effectiveTo: string }[];
};

const KIND_ROUTE = { tax: "tax", pension: "pension", socialSecurity: "social-security" } as const;
const KIND_LABEL = {
  tax: { ar: "ضريبة الدخل", en: "Income tax" },
  pension: { ar: "التقاعد", en: "Pension" },
  socialSecurity: { ar: "الضمان الاجتماعي", en: "Social security" },
} as const;

export default function PayrollHomePage() {
  const { t } = useLocale();
  const summary = useApi<Summary>("/api/payroll/config/summary");
  const activity = useApi<ConfigActivity[]>("/api/payroll/config/activity-log");
  const s = summary.data;
  const loading = summary.loading ? "…" : "—";

  return (
    <div className="space-y-8">
      <PageHeader title={moduleLabels.payroll} description={payrollScreenDescriptions.module} />

      {s && s.expiringSoon.length > 0 && (
        <div role="alert" className="rounded-xl border border-secondary-orange/40 bg-secondary-orange/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="size-4 text-secondary-orange" />
            {t(landingLabels.expiringAlert)}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {s.expiringSoon.map((x) => (
              <li key={x.id}>
                <Link href={`/payroll/config/${KIND_ROUTE[x.kind]}`} className="font-medium underline-offset-2 hover:underline">
                  {t(KIND_LABEL[x.kind])}
                </Link>{" "}
                {t(landingLabels.expiringBody)} <bdi dir="ltr">{formatDate(x.effectiveTo)}</bdi>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RunDashboard />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title={t(landingLabels.kpiActiveComponents)}
          value={s ? `${s.activeComponents}` : loading}
          description={s ? `/ ${s.totalComponents}` : undefined}
          icon={Layers}
          tone="success"
        />
        <KPICard title={t(landingLabels.kpiStructures)} value={s ? s.activeStructures : loading} icon={Layers3} />
        <KPICard
          title={t(landingLabels.kpiTopProfile)}
          value={s?.topProfile ? t(s.topProfile.name) : loading}
          description={s?.topProfile ? `${s.topProfile.count} ${t(landingLabels.employeesSuffix)}` : undefined}
          icon={Users}
          tone="info"
        />
        <KPICard
          title={t(landingLabels.kpiExpiring)}
          value={s ? s.expiringSoon.length : loading}
          description={s ? `${t(landingLabels.expiringNote)} · ${t(landingLabels.kpiUpcoming)}: ${s.upcomingChanges}` : undefined}
          icon={CalendarClock}
          tone={s && s.expiringSoon.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ModuleScreensGrid moduleKey="payroll" columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
        </div>
        <div className="space-y-5">
          {s && (
            <DetailSection title={t(landingLabels.configHealth)}>
              <dl className="space-y-2 text-sm">
                {(
                  [
                    [landingLabels.lastTax, s.lastUpdated.tax],
                    [landingLabels.lastPension, s.lastUpdated.pension],
                    [landingLabels.lastSs, s.lastUpdated.socialSecurity],
                  ] as const
                ).map(([label, date]) => (
                  <div key={label.en} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t(label)}</dt>
                    <dd>
                      <bdi dir="ltr">{formatDate(date)}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
          )}
          <DetailSection title={t(landingLabels.recentActivity)}>
            <AuditTimeline activity={(activity.data ?? []).slice(0, 4)} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
