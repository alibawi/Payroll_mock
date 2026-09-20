import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function SalaryStructuresPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.structures}
      description={payrollScreenDescriptions.structures}
    />
  );
}
