"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { ComponentForm } from "@/components/payroll/component-form";
import { commonLabels } from "@/lib/i18n/labels";
import { componentScreenLabels, configCommon } from "@/lib/i18n/payroll-config-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { PayrollComponent } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

export default function EditPayComponentPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const can = useCan();
  const { data, error } = useApi<PayrollComponent>(`/api/payroll/config/components/${id}`);

  if (!can("payroll.component", "update")) return <EmptyState title={configCommon.readOnly} />;
  if (error) return <EmptyState title={configCommon.notFound} description={{ ar: error, en: error }} />;
  if (!data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={componentScreenLabels.edit}
        description={{ ar: `${data.name.ar} — ${data.code}`, en: `${data.name.en} — ${data.code}` }}
      />
      <ComponentForm component={data} />
    </div>
  );
}
