import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PensionConfigPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.pension}
      description={payrollScreenDescriptions.pension}
    />
  );
}
