import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function PayrollPermissionsPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.permissions}
      description={payrollScreenDescriptions.permissions}
    />
  );
}
