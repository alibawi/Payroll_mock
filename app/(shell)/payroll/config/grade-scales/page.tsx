"use client";

import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { GradeGrid } from "@/components/payroll/grade-grid";
import { IllustrativeNotice } from "@/components/payroll/illustrative-notice";
import { OptionSelect } from "@/components/payroll/option-select";
import { commonLabels } from "@/lib/i18n/labels";
import { configCommon, gradeLabels } from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import { useApi } from "@/lib/payroll/api-client";
import type { GovtGradeScale } from "@/lib/payroll/types";

export default function PayGradeScalesPage() {
  const { t } = useLocale();
  const { data, loading, error, reload } = useApi<GovtGradeScale[]>("/api/payroll/config/grade-scales");
  const [selected, setSelected] = useState<string>("");

  const scale = data?.find((s) => s.id === selected) ?? data?.[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.gradeScales}
        description={payrollScreenDescriptions.gradeScales}
        actions={
          data && data.length > 1 ? (
            <div className="w-64">
              <OptionSelect
                value={scale?.id ?? ""}
                onChange={setSelected}
                options={data.map((s) => ({ value: s.id, label: t(s.name) }))}
                placeholder={t(gradeLabels.scale)}
              />
            </div>
          ) : undefined
        }
      />
      <IllustrativeNotice />
      {loading && <p className="py-12 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
      {error && (
        <p className="py-12 text-center text-sm text-destructive">
          {t(commonLabels.loadError)}{" "}
          <button type="button" onClick={reload} className="underline">
            {t(commonLabels.retry)}
          </button>
        </p>
      )}
      {data && !scale && <EmptyState title={configCommon.notFound} />}
      {scale && <GradeGrid key={scale.updatedAt} scale={scale} onSaved={reload} />}
    </div>
  );
}
