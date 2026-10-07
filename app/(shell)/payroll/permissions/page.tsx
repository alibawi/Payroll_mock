"use client";

import { useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { PageHeader } from "@/components/page-header";
import { DetailSection } from "@/components/payroll/detail-section";
import { useRole, type Role } from "@/components/role-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roleLabels } from "@/lib/i18n/labels";
import { permissionLabels } from "@/lib/i18n/payroll-config-labels";
import { payrollNavLabels, payrollScreenDescriptions } from "@/lib/i18n/payroll-labels";
import {
  DEFAULT_PERMISSIONS,
  PAYROLL_ACTIONS,
  PAYROLL_SUBJECTS,
  SUBJECT_ACTIONS,
  type PayrollAction,
  type PayrollSubject,
} from "@/lib/payroll/permissions";

const ROLES = Object.keys(DEFAULT_PERMISSIONS) as Role[];

type Matrix = Record<Role, Record<PayrollSubject, PayrollAction[]>>;

const clone = (): Matrix => JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));

/**
 * Role × subject × action matrix. The toggles are cosmetic (spec §5): they only change this screen's
 * local state — the real button hiding follows lib/payroll/permissions.ts defaults.
 */
export default function PayrollPermissionsPage() {
  const { t } = useLocale();
  const { role } = useRole();
  const [matrix, setMatrix] = useState<Matrix>(clone);
  const [selected, setSelected] = useState<Role>(role ?? "payrollOfficer");

  const toggle = (subject: PayrollSubject, action: PayrollAction, on: boolean) =>
    setMatrix((m) => ({
      ...m,
      [selected]: {
        ...m[selected],
        [subject]: on ? [...m[selected][subject], action] : m[selected][subject].filter((a) => a !== action),
      },
    }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={payrollNavLabels.permissions}
        description={payrollScreenDescriptions.permissions}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setMatrix(clone())}>
            {t(permissionLabels.reset)}
          </Button>
        }
      />

      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {t(permissionLabels.yourRole)}:{" "}
        {role ? <StatusBadge tone="info" label={t(roleLabels[role])} /> : <StatusBadge label={t(permissionLabels.noRole)} />}
      </p>

      <Tabs value={selected} onValueChange={(value) => setSelected(value as Role)}>
        <TabsList className="flex-wrap">
          {ROLES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {t(roleLabels[r])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DetailSection title={t(permissionLabels.matrix)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-3 py-2 text-start font-medium">{t(permissionLabels.subject)}</th>
                {PAYROLL_ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-2 text-center font-medium">
                    {t(permissionLabels.actions[action])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAYROLL_SUBJECTS.map((subject) => (
                <tr key={subject} className="border-t border-border">
                  <td className="px-3 py-3">
                    <div className="font-medium">{t(permissionLabels.subjects[subject])}</div>
                    <bdi dir="ltr" className="font-mono text-[11px] text-muted-foreground">
                      {subject}
                    </bdi>
                  </td>
                  {PAYROLL_ACTIONS.map((action) => (
                    <td key={action} className="px-3 py-3 text-center">
                      {!SUBJECT_ACTIONS[subject].includes(action) ? (
                        <span className="text-muted-foreground/50">—</span>
                      ) : (
                      <Checkbox
                        aria-label={`${t(permissionLabels.subjects[subject])} — ${t(permissionLabels.actions[action])}`}
                        checked={matrix[selected][subject].includes(action)}
                        onCheckedChange={(checked) => toggle(subject, action, checked === true)}
                      />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t(permissionLabels.note)}</p>
      </DetailSection>
    </div>
  );
}
