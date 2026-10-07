import {
  Archive,
  Banknote,
  Calculator,
  Factory,
  FileSpreadsheet,
  Handshake,
  Receipt,
  Settings,
  Ship,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SquareKanban,
  Store,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import type { Locale } from "@/components/locale-provider";
import { moduleLabels } from "@/lib/i18n/labels";
import {
  payrollNavGroupLabels,
  payrollNavLabels,
} from "@/lib/i18n/payroll-labels";
import type { TileColor } from "@/lib/tile-styles";

export type ModuleKey = keyof typeof moduleLabels;

export type ModuleNavChild = {
  href: string;
  label: Record<Locale, string>;
  /** Heading shown above the first child of each group. */
  group?: Record<Locale, string>;
};

export type ModuleNavItem = {
  key: ModuleKey;
  href: string;
  icon: LucideIcon;
  tile: TileColor;
  /** Launcher shortcut badge (visual only). */
  shortcut?: string;
  /** Only payroll is a live module; the rest open ComingSoon. */
  live?: boolean;
  children?: ModuleNavChild[];
};

const payrollChildren: ModuleNavChild[] = [
  { href: "/payroll/config/components", label: payrollNavLabels.components, group: payrollNavGroupLabels.setup },
  { href: "/payroll/config/profiles", label: payrollNavLabels.profiles },
  { href: "/payroll/config/structures", label: payrollNavLabels.structures },
  { href: "/payroll/config/grade-scales", label: payrollNavLabels.gradeScales },
  { href: "/payroll/config/tax", label: payrollNavLabels.tax },
  { href: "/payroll/config/pension", label: payrollNavLabels.pension },
  { href: "/payroll/config/social-security", label: payrollNavLabels.socialSecurity },
  { href: "/payroll/compensations", label: payrollNavLabels.compensations, group: payrollNavGroupLabels.people },
  { href: "/payroll/loans", label: payrollNavLabels.loans },
  { href: "/payroll/penalties", label: payrollNavLabels.penalties },
  { href: "/payroll/periods", label: payrollNavLabels.periods, group: payrollNavGroupLabels.runs },
  { href: "/payroll/inputs", label: payrollNavLabels.inputs },
  { href: "/payroll/runs", label: payrollNavLabels.runs },
  { href: "/payroll/reports", label: payrollNavLabels.reports, group: payrollNavGroupLabels.reports },
  { href: "/payroll/remittances", label: payrollNavLabels.remittances },
  { href: "/payroll/end-of-service", label: payrollNavLabels.endOfService },
  { href: "/payroll/my-payslips", label: payrollNavLabels.myPayslips, group: payrollNavGroupLabels.selfService },
  { href: "/payroll/my-loans", label: payrollNavLabels.myLoans },
  { href: "/payroll/permissions", label: payrollNavLabels.permissions, group: payrollNavGroupLabels.admin },
  { href: "/dashboard", label: payrollNavLabels.dashboard },
];

/** Order follows docs/assets/enki-erp-home.png; payroll sits right after HR. */
export const moduleNavItems: ModuleNavItem[] = [
  { key: "administration", href: "/administration", icon: Settings, tile: "slate", shortcut: "O" },
  { key: "shipping", href: "/shipping", icon: Ship, tile: "sky", shortcut: "G" },
  { key: "pos", href: "/pos", icon: Store, tile: "yellow" },
  { key: "sales", href: "/sales", icon: Receipt, tile: "mint", shortcut: "S" },
  { key: "market", href: "/market", icon: ShoppingCart, tile: "orange", shortcut: "K" },
  { key: "inventory", href: "/inventory", icon: Warehouse, tile: "blue", shortcut: "V" },
  { key: "hr", href: "/hr", icon: Users, tile: "pink", shortcut: "H" },
  { key: "payroll", href: "/payroll", icon: Banknote, tile: "fuchsia", shortcut: "Y", live: true, children: payrollChildren },
  { key: "finance", href: "/finance", icon: Calculator, tile: "indigo", shortcut: "F" },
  { key: "security", href: "/security", icon: ShieldCheck, tile: "teal", shortcut: "M" },
  { key: "purchases", href: "/purchases", icon: ShoppingBag, tile: "amber", shortcut: "P" },
  { key: "archive", href: "/archive", icon: Archive, tile: "lime", shortcut: "R" },
  { key: "forms", href: "/forms", icon: FileSpreadsheet, tile: "violet", shortcut: "D" },
  { key: "crm", href: "/crm", icon: Handshake, tile: "red" },
  { key: "projects", href: "/projects", icon: SquareKanban, tile: "cyan", shortcut: "E" },
  { key: "manufacturing", href: "/manufacturing", icon: Factory, tile: "blue", shortcut: "U" },
];

export function isWithinPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Human label for a breadcrumb path, or null when unknown (the caller falls back to the raw segment). */
export function resolveCrumbLabel(href: string, locale: Locale): string | null {
  const moduleItem = moduleNavItems.find((item) => item.href === href);
  if (moduleItem) return moduleLabels[moduleItem.key][locale];
  for (const item of moduleNavItems) {
    const child = item.children?.find((c) => c.href === href);
    if (child) return child.label[locale];
  }
  if (href === "/payroll/config") return payrollNavGroupLabels.setup[locale];
  return null;
}
