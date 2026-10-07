"use client";

import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { MoneyCell } from "@/components/payroll/money-cell";
import { StatusBadge } from "@/components/status-badge";
import { commonLabels } from "@/lib/i18n/labels";
import { myPayslipsLabels, paidStatusLabels, paidStatusTones } from "@/lib/i18n/payroll-run-labels";
import { useApi } from "@/lib/payroll/api-client";
import { formatPeriod } from "@/lib/payroll/periods";
import type { PaidStatus } from "@/lib/payroll/types";

type Row = {
  id: string;
  runId: string;
  runNo: string;
  periodKey: string;
  grossPay: number;
  totalEmployeeDeductions: number;
  netPay: number;
  paidStatus: PaidStatus;
  paidDate: string | null;
};

/** Self-service (spec §7): the employee sees only their own payslips of posted runs. */
export default function MyPayslipsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const payslips = useApi<Row[]>("/api/payroll/my-payslips");

  const columns: DataTableColumn<Row>[] = [
    { key: "period", header: t(myPayslipsLabels.period), sortValue: (r) => r.periodKey, cell: (r) => <bdi dir="ltr" className="font-medium">{formatPeriod(r.periodKey)}</bdi> },
    { key: "run", header: t(myPayslipsLabels.run), cell: (r) => <bdi dir="ltr" className="font-mono text-xs">{r.runNo}</bdi> },
    { key: "gross", header: t(myPayslipsLabels.gross), sortValue: (r) => r.grossPay, cell: (r) => <MoneyCell value={r.grossPay} /> },
    { key: "deductions", header: t(myPayslipsLabels.deductions), cell: (r) => <MoneyCell value={-r.totalEmployeeDeductions} signed /> },
    { key: "net", header: t(myPayslipsLabels.net), sortValue: (r) => r.netPay, cell: (r) => <MoneyCell value={r.netPay} bold /> },
    { key: "paid", header: t(myPayslipsLabels.paid), cell: (r) => <StatusBadge label={t(paidStatusLabels[r.paidStatus])} tone={paidStatusTones[r.paidStatus]} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={myPayslipsLabels.title} description={myPayslipsLabels.description} />
      <DataTable
        data={payslips.data ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={payslips.loading}
        error={payslips.error ? t(commonLabels.loadError) : undefined}
        onRetry={payslips.reload}
        emptyMessage={t(myPayslipsLabels.empty)}
        onRowClick={(r) => router.push(`/payroll/reports/payslip/${r.id}`)}
      />
    </div>
  );
}
