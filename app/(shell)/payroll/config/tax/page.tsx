"use client";

import { PageHeader } from "@/components/page-header";
import { IllustrativeNotice } from "@/components/payroll/illustrative-notice";
import { TaxScreen } from "@/components/payroll/tax-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayTaxPage() {
  return (
    <div className="space-y-5">
      <PageHeader title={payrollNavLabels.tax} description={payrollScreenDescriptions.tax} />
      <IllustrativeNotice />
      <TaxScreen />
    </div>
  );
}
