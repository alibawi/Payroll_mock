"use client";

import { Check, Pencil, Power, PowerOff, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { EmptyState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { AuditTimeline } from "@/components/payroll/audit-timeline";
import { ActiveBadge, ComponentTypeBadge } from "@/components/payroll/component-badges";
import { DetailField, DetailGrid, DetailSection } from "@/components/payroll/detail-section";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { commonLabels } from "@/lib/i18n/labels";
import {
  calculationMethodLabels,
  componentCategoryLabels,
  componentFlagLabels,
  componentScreenLabels,
  configCommon,
} from "@/lib/i18n/payroll-config-labels";
import { apiFetch, useApi } from "@/lib/payroll/api-client";
import type { ConfigActivity, GlAccount, PayrollComponent, SalaryStructure } from "@/lib/payroll/types";
import { useCan } from "@/lib/payroll/use-can";
import { cn } from "@/lib/utils";

type Detail = PayrollComponent & { usedInStructures: Pick<SalaryStructure, "id" | "code" | "name" | "isActive">[] };

const FLAGS = ["isTaxable", "isPensionable", "isSocialSecurityBase", "isProratable", "reducesGross"] as const;

export default function PayComponentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useLocale();
  const can = useCan();

  const detail = useApi<Detail>(`/api/payroll/config/components/${id}`);
  const all = useApi<PayrollComponent[]>("/api/payroll/config/components");
  const gl = useApi<GlAccount[]>("/api/payroll/config/gl-accounts");
  const audit = useApi<ConfigActivity[]>(`/api/payroll/config/activity-log?entityType=component&entityId=${id}`);

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const item = detail.data;
  const glName = (code: string | null) => {
    if (!code) return null;
    const account = gl.data?.find((a) => a.code === code);
    return (
      <span>
        <bdi dir="ltr" className="font-mono text-xs">
          {code}
        </bdi>
        {account && <> — {t(account.name)}</>}
      </span>
    );
  };

  async function toggleActive() {
    if (!item) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/payroll/config/components/${id}`, { method: "PATCH", body: { isActive: !item.isActive } });
      setConfirming(false);
      detail.reload();
      audit.reload();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (detail.error) {
    return (
      <EmptyState
        title={configCommon.notFound}
        description={{ ar: detail.error, en: detail.error }}
      >
        <Link href="/payroll/config/components" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {t(configCommon.backToList)}
        </Link>
      </EmptyState>
    );
  }

  if (!item) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t(commonLabels.loading)}</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={item.name}
        description={{ ar: `${item.code}`, en: `${item.code}` }}
        actions={
          <>
            <ComponentTypeBadge type={item.componentType} />
            <ActiveBadge active={item.isActive} />
            {can("payroll.component", "update") && (
              <Link
                href={`/payroll/config/components/${id}/edit`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Pencil className="size-4" />
                {t(componentScreenLabels.edit)}
              </Link>
            )}
            {can("payroll.component", "delete") && (
              <Button
                type="button"
                variant={item.isActive ? "outline" : "default"}
                size="sm"
                onClick={() => setConfirming(true)}
              >
                {item.isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                {item.isActive ? t(configCommon.deactivate) : t(configCommon.activate)}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DetailSection title={t(componentScreenLabels.basics)}>
            <DetailGrid>
              <DetailField label={t(configCommon.code)}>
                <bdi dir="ltr" className="font-mono text-xs">
                  {item.code}
                </bdi>
              </DetailField>
              <DetailField label={t(configCommon.nameAr)}>{item.name.ar}</DetailField>
              <DetailField label={t(configCommon.nameEn)}>{item.name.en}</DetailField>
              <DetailField label={t(configCommon.type)}>
                <ComponentTypeBadge type={item.componentType} />
              </DetailField>
              <DetailField label={t(configCommon.category)}>{t(componentCategoryLabels[item.category])}</DetailField>
              <DetailField label={t(configCommon.sequence)}>
                <bdi dir="ltr">{item.sequence}</bdi>
              </DetailField>
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(componentScreenLabels.calculation)}>
            <DetailGrid>
              <DetailField label={t(configCommon.method)}>{t(calculationMethodLabels[item.calculationMethod])}</DetailField>
              <DetailField label={t(configCommon.percent)}>
                {item.percentValue != null ? <bdi dir="ltr">{item.percentValue}%</bdi> : null}
              </DetailField>
              <DetailField label={t(configCommon.baseComponents)} className="sm:col-span-2 lg:col-span-1">
                {item.baseComponentCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.baseComponentCodes.map((code) => {
                      const base = all.data?.find((c) => c.code === code);
                      return (
                        <Link key={code} href={base ? `/payroll/config/components/${base.id}` : "#"}>
                          <StatusBadge label={base ? t(base.name) : code} tone="info" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </DetailField>
            </DetailGrid>
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-3 text-xs text-muted-foreground">{t(componentScreenLabels.flagsHint)}</p>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FLAGS.map((flag) => (
                  <li key={flag} className="flex items-center gap-2 text-sm">
                    {item[flag] ? (
                      <Check className="size-4 text-secondary-green" />
                    ) : (
                      <X className="size-4 text-muted-foreground/60" />
                    )}
                    <span className={item[flag] ? "text-foreground" : "text-muted-foreground"}>
                      {t(componentFlagLabels[flag])}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </DetailSection>

          <DetailSection title={t(componentScreenLabels.gl)}>
            <DetailGrid className="lg:grid-cols-2">
              <DetailField label={t(configCommon.expenseAccount)}>{glName(item.expenseAccountCode)}</DetailField>
              <DetailField label={t(configCommon.payableAccount)}>{glName(item.payableAccountCode)}</DetailField>
            </DetailGrid>
          </DetailSection>

          <DetailSection title={t(componentScreenLabels.usedIn)}>
            {item.usedInStructures.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(componentScreenLabels.notUsed)}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {item.usedInStructures.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/payroll/config/structures/${s.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/60"
                    >
                      <bdi dir="ltr" className="font-mono text-xs">
                        {s.code}
                      </bdi>
                      <span className="text-muted-foreground">{t(s.name)}</span>
                      {!s.isActive && <StatusBadge label={t(configCommon.inactive)} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>

        <DetailSection title={t(componentScreenLabels.audit)} className="h-fit">
          <AuditTimeline activity={audit.data ?? []} />
        </DetailSection>
      </div>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title={item.isActive ? t(componentScreenLabels.deactivateConfirmTitle) : t(configCommon.activate)}
        description={item.isActive ? t(componentScreenLabels.deactivateConfirmBody) : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              {t(commonLabels.cancel)}
            </Button>
            <Button type="button" onClick={toggleActive} disabled={busy}>
              {busy ? t(configCommon.saving) : t(commonLabels.confirm)}
            </Button>
          </>
        }
      >
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        <p className="text-sm text-muted-foreground" dir={locale === "ar" ? "rtl" : "ltr"}>
          <bdi dir="ltr" className="font-mono">
            {item.code}
          </bdi>{" "}
          — {t(item.name)}
        </p>
      </Modal>
    </div>
  );
}
