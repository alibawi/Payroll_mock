import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function TaxConfigPage() {
  return (
    <ScaffoldScreen title={payrollNavLabels.tax} description={payrollScreenDescriptions.tax} />
  );
}
