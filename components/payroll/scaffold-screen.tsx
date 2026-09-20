"use client";

import { Hammer } from "lucide-react";

import type { Locale } from "@/components/locale-provider";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { scaffoldLabels } from "@/lib/i18n/payroll-labels";

/** Empty payroll screen: title + description + a "no data yet" panel. Replaced screen by screen. */
export function ScaffoldScreen({
  title,
  description,
}: {
  title: Record<Locale, string>;
  description: Record<Locale, string>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Hammer}
        title={scaffoldLabels.title}
        description={scaffoldLabels.description}
      />
    </div>
  );
}
