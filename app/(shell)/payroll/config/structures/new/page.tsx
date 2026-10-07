"use client";

import { PageHeader } from "@/components/page-header";
import { StructureEditor } from "@/components/payroll/structure-editor";
import { structureLabels } from "@/lib/i18n/payroll-config-labels";
import { payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";

export default function NewPayStructurePage() {
  return (
    <div className="space-y-5">
      <PageHeader title={structureLabels.newStructure} description={payrollScreenDescriptions.structures} />
      <StructureEditor />
    </div>
  );
}
