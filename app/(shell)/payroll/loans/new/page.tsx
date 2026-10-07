"use client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { LoanForm } from "@/components/payroll/loan-form";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { loanFormLabels } from "@/lib/i18n/payroll-loan-labels";
import { useCan } from "@/lib/payroll/use-can";

export default function NewLoanPage() {
  const can = useCan();
  if (!can("payroll.loan", "create")) return <EmptyState title={configCommon.readOnly} />;
  return (
    <div className="space-y-5">
      <PageHeader title={loanFormLabels.newTitle} />
      <LoanForm />
    </div>
  );
}
