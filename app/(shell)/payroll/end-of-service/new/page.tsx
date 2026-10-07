"use client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { EosForm } from "@/components/payroll/eos-form";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { eosLabels } from "@/lib/i18n/payroll-report-labels";
import { useCan } from "@/lib/payroll/use-can";

export default function NewEosPage() {
  const can = useCan();
  if (!can("payroll.eos", "create")) return <EmptyState title={configCommon.readOnly} />;
  return (
    <div className="space-y-5">
      <PageHeader title={eosLabels.newTitle} />
      <EosForm />
    </div>
  );
}
