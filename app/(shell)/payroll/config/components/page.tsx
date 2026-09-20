import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayComponentsPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.components}
      description={payrollScreenDescriptions.components}
    />
  );
}
