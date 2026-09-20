import { PageHeader } from "@/components/page-header";
import { ModuleScreensGrid } from "@/components/module-screens-grid";
import { moduleLabels } from "@/lib/i18n/labels";
import { payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayrollHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader title={moduleLabels.payroll} description={payrollScreenDescriptions.module} />
      <ModuleScreensGrid moduleKey="payroll" />
    </div>
  );
}
