"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { LoanForm } from "@/components/payroll/loan-form";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { loanDetailLabels, loanFormLabels } from "@/lib/i18n/payroll-loan-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { EmployeeLoan } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";

export default function EditLoanPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const can = useCan();
  const { data, error } = useApi<{ loan: EmployeeLoan }>(`/api/payroll/loans/${id}`);

  if (!can("payroll.loan", "update")) return <EmptyState title={configCommon.readOnly} />;
  if (error) return <EmptyState title={loanDetailLabels.notFound} description={{ ar: error, en: error }} />;
  if (!data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;
  if (data.loan.status !== "Draft") return <EmptyState title={{ ar: "التعديل للمسودات فقط", en: "Only drafts can be edited" }} />;

  return (
    <div className="space-y-5">
      <PageHeader title={loanFormLabels.editTitle} description={{ ar: data.loan.loanNo, en: data.loan.loanNo }} />
      <LoanForm loan={data.loan} />
    </div>
  );
}
