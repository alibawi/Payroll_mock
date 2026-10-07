"use client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PenaltyForm } from "@/components/payroll/penalty-form";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { penaltyFormLabels } from "@/lib/i18n/payroll-penalty-labels";
import { useCan } from "@/lib/payroll/use-can";

export default function NewPenaltyPage() {
  const can = useCan();
  if (!can("payroll.penalty", "create")) return <EmptyState title={configCommon.readOnly} />;
  return (
    <div className="space-y-5">
      <PageHeader title={penaltyFormLabels.newTitle} />
      <PenaltyForm />
    </div>
  );
}
