import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function SocialSecurityConfigPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.socialSecurity}
      description={payrollScreenDescriptions.socialSecurity}
    />
  );
}
