"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/locale-provider";
import { useRole } from "@/components/role-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { commonLabels } from "@/lib/i18n/labels";
import { useApi } from "@/lib/payroll/api-client";
import { cn } from "@/lib/utils";

type Item = { id: string; severity: "info" | "warning" | "critical"; title: { ar: string; en: string }; body: { ar: string; en: string }; href: string };

const DOT = { critical: "bg-destructive", warning: "bg-secondary-orange", info: "bg-primary" } as const;

/** Topbar bell: role-specific tasks and alerts from /api/payroll/notifications, with a counter badge. */
export function NotificationsBell() {
  const { t } = useLocale();
  const { role } = useRole();
  const router = useRouter();
  // the role is part of the URL so the list refetches when the demo switches role
  const notes = useApi<{ items: Item[]; count: number }>(role ? `/api/payroll/notifications?role=${role}` : null);
  const count = role ? (notes.data?.count ?? 0) : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label={t(commonLabels.notifications)} className="relative">
            <Bell className="size-[18px]" />
            {count > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">{count}</span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-96 w-80 overflow-y-auto">
        <p className="px-2 py-1.5 text-sm font-semibold">{t(commonLabels.notifications)}</p>
        {(notes.data?.items ?? []).length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{t({ ar: "لا توجد إشعارات", en: "No notifications" })}</p>}
        {(notes.data?.items ?? []).map((n) => (
          <DropdownMenuItem key={n.id} onClick={() => router.push(n.href)} className="items-start gap-2">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[n.severity])} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t(n.title)}</span>
              <span className="block truncate text-xs text-muted-foreground">{t(n.body)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
