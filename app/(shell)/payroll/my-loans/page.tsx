"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/payroll/amount";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { commonLabels } from "@/lib/i18n/labels";
import { loanListLabels, loanStatusLabels, loanStatusTones, loanTypeLabels } from "@/lib/i18n/payroll-loan-labels";
import { payrollNavLabels } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import { MOCK_EMPLOYEE_ID } from "@/lib/payroll/permissions";
import type { LoanRow } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

// Employee self-service (screen 10 of the loans spec): own loans + a new request. A fuller version with
// payslips arrives in module 7; the mock employee is fixed (MOCK_EMPLOYEE_ID).
export default function MyLoansPage() {
  const { t } = useLocale();
  const router = useRouter();
  const loans = useApi<LoanRow[]>(`/api/payroll/loans?employeeId=${MOCK_EMPLOYEE_ID}`);

  const columns: DataTableColumn<LoanRow>[] = [
    { key: "loanNo", header: t(loanListLabels.loanNo), cell: (r) => <bdi dir="ltr" className="font-mono text-xs">{r.loanNo}</bdi> },
    { key: "type", header: t(loanListLabels.type), cell: (r) => t(loanTypeLabels[r.loanType]) },
    { key: "principal", header: t(loanListLabels.principal), cell: (r) => <Amount value={r.principal} /> },
    { key: "balance", header: t(loanListLabels.balance), cell: (r) => <Amount value={r.outstandingBalance} bold /> },
    { key: "status", header: t(loanListLabels.status), cell: (r) => <StatusBadge label={t(loanStatusLabels[r.status])} tone={loanStatusTones[r.status]} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.myLoans}
        description={{ ar: "قروضك وسلفك وطلب سلفة جديدة", en: "Your loans and advances, and a new request" }}
        actions={
          <Link href="/payroll/loans/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" />
            {t(loanListLabels.newRequest)}
          </Link>
        }
      />
      <DataTable
        data={loans.data ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loans.loading}
        error={loans.error ? t(commonLabels.loadError) : undefined}
        onRetry={loans.reload}
        onRowClick={(r) => router.push(`/payroll/loans/${r.id}`)}
      />
    </div>
  );
}
