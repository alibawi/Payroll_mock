"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { PenaltyForm } from "@/components/payroll/penalty-form";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { penaltyDetailLabels, penaltyFormLabels } from "@/lib/i18n/payroll-penalty-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { DisciplinaryPenalty } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

export default function EditPenaltyPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const can = useCan();
  const { data, error } = useApi<{ penalty: DisciplinaryPenalty }>(`/api/payroll/penalties/${id}`);

  if (!can("payroll.penalty", "update")) return <EmptyState title={configCommon.readOnly} />;
  if (error) return <EmptyState title={penaltyDetailLabels.notFound} description={{ ar: error, en: error }} />;
  if (!data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;
  if (data.penalty.status !== "Draft") return <EmptyState title={{ ar: "التعديل للمسودات فقط", en: "Only drafts can be edited" }} />;

  return (
    <div className="space-y-5">
      <PageHeader title={penaltyFormLabels.editTitle} description={{ ar: data.penalty.penaltyNo, en: data.penalty.penaltyNo }} />
      <PenaltyForm penalty={data.penalty} />
    </div>
  );
}
