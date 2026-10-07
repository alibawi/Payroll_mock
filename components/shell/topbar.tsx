"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Plus, Sun } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { GlobalSearch } from "@/components/shell/global-search";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { RoleSwitcher } from "@/components/shell/role-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appLabels, commonLabels } from "@/lib/i18n/labels";

const quickCreate = [
  { href: "/payroll/runs/new", label: { ar: "دورة رواتب جديدة", en: "New payroll run" } },
  { href: "/payroll/loans/new", label: { ar: "طلب سلفة / قرض", en: "New loan / advance" } },
  { href: "/payroll/inputs", label: { ar: "مدخل رواتب جديد", en: "New payroll input" } },
  { href: "/payroll/penalties/new", label: { ar: "عقوبة تأديبية جديدة", en: "New penalty" } },
] as const;

export function Topbar() {
  const { t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K focuses the global search box.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <span className="hidden truncate text-sm font-semibold text-foreground md:block">
        {t(appLabels.companyName)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={t(commonLabels.create)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-5" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          {quickCreate.map((item) => (
            <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
              {t(item.label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <GlobalSearch />


      <div className="ms-auto flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t(commonLabels.switchTheme)}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-[18px] dark:hidden" />
          <Moon className="hidden size-[18px] dark:block" />
        </Button>

        <NotificationsBell />
        <RoleSwitcher />
      </div>
    </header>
  );
}
