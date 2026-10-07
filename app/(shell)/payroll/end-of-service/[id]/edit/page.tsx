"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { EosForm } from "@/components/payroll/eos-form";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { eosLabels } from "@/lib/i18n/payroll-report-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { EndOfServiceCalculation } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

export default function EditEosPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const can = useCan();
  const detail = useApi<{ eos: EndOfServiceCalculation }>(`/api/payroll/end-of-service/${id}`);
  if (!can("payroll.eos", "update")) return <EmptyState title={configCommon.readOnly} />;
  if (detail.error) return <EmptyState title={eosLabels.notFound} />;
  if (!detail.data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;
  if (detail.data.eos.status !== "Draft") return <EmptyState title={configCommon.readOnly} />;
  return (
    <div className="space-y-5">
      <PageHeader title={{ ar: `${eosLabels.editTitle.ar} ${detail.data.eos.eosNo}`, en: `${eosLabels.editTitle.en} ${detail.data.eos.eosNo}` }} />
      <EosForm claim={detail.data.eos} />
    </div>
  );
}
