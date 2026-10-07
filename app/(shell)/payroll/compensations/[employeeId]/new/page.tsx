"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { CompensationForm } from "@/components/payroll/compensation-form";
import { commonLabels } from "@/lib/i18n/labels";
import { compDetailLabels, compFormLabels } from "@/lib/i18n/payroll-compensation-labels";
import { configCommon } from "@/lib/i18n/payroll-config-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { ConfigBundle } from "@/lib/payroll/preview";
import type { EmployeeCompensation, EmployeeCompensationComponent } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import type { Employee } from "@/lib/types/hr";

type Detail = {
  employee: Employee;
  records: EmployeeCompensation[];
  current: (EmployeeCompensation & { overrides: EmployeeCompensationComponent[] }) | null;
  minimumWage: number;
};

export default function AssignCompensationPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { t } = useLocale();
  const can = useCan();
  const detail = useApi<Detail>(`/api/payroll/compensations/${employeeId}`);
  const bundle = useApi<ConfigBundle>("/api/payroll/config/bundle");

  if (!can("payroll.compensation", "create")) return <EmptyState title={configCommon.readOnly} />;
  if (detail.error) return <EmptyState title={compDetailLabels.notFound} description={{ ar: detail.error, en: detail.error }} />;
  if (!detail.data || !bundle.data) return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;

  const { employee } = detail.data;
  return (
    <div className="space-y-5">
      <PageHeader
        title={compFormLabels.title}
        description={{
          ar: `${employee.fullNameAr} — ${t(compFormLabels.subtitle)}`,
          en: `${employee.fullNameEn} — ${compFormLabels.subtitle.en}`,
        }}
      />
      <CompensationForm
        employee={employee}
        current={detail.data.current}
        allRecords={detail.data.records}
        bundle={bundle.data}
        minimumWage={detail.data.minimumWage}
      />
    </div>
  );
}
