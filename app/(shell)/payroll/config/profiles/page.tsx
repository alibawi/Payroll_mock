import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayrollProfilesPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.profiles}
      description={payrollScreenDescriptions.profiles}
    />
  );
}
