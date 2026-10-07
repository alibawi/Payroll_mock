"use client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ComponentForm } from "@/components/payroll/component-form";
import { componentScreenLabels, configCommon } from "@/lib/i18n/payroll-config-labels";
import { payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useCan } from "@/lib/payroll/use-can";

export default function NewPayComponentPage() {
  const can = useCan();

  if (!can("payroll.component", "create")) {
    return <EmptyState title={configCommon.readOnly} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={componentScreenLabels.createTitle} description={payrollScreenDescriptions.components} />
      <ComponentForm />
    </div>
  );
}
