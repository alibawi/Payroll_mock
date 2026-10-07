"use client";

import { PageHeader } from "@/components/page-header";
import { IllustrativeNotice } from "@/components/payroll/illustrative-notice";
import { StatutoryScreen } from "@/components/payroll/statutory-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayPensionPage() {
  return (
    <div className="space-y-5">
      <PageHeader title={payrollNavLabels.pension} description={payrollScreenDescriptions.pension} />
      <IllustrativeNotice />
      <StatutoryScreen kind="pension" />
    </div>
  );
}
