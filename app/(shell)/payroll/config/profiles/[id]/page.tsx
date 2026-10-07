"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/payroll/component-badges";
import { ProfileEditor } from "@/components/payroll/profile-editor";
import { buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { PayrollProfile } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

export default function PayProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const { data, error, reload } = useApi<PayrollProfile>(`/api/payroll/config/profiles/${id}`);

  if (error) {
    return (
      <EmptyState title={configCommon.notFound} description={{ ar: error, en: error }}>
        <Link href="/payroll/config/profiles" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {t(configCommon.backToList)}
        </Link>
      </EmptyState>
    );
  }
  if (!data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={data.name}
        description={{ ar: data.code, en: data.code }}
        actions={<ActiveBadge active={data.isActive} />}
      />
      {/* key resets the draft when fresh data arrives after a save */}
      <ProfileEditor key={data.updatedAt} profile={data} onSaved={reload} />
    </div>
  );
}
