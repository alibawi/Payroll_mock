import { ScaffoldScreen } from "@/components/payroll/scaffold-screen";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function GradeScalesPage() {
  return (
    <ScaffoldScreen
      title={payrollNavLabels.gradeScales}
      description={payrollScreenDescriptions.gradeScales}
    />
  );
}
