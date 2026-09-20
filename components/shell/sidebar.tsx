"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, Languages, Menu, Settings } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { BrandMark } from "@/components/shell/brand-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appLabels, commonLabels, moduleLabels } from "@/lib/i18n/labels";
import { isWithinPath, moduleNavItems } from "@/lib/navigation";
import { usePersistedBoolean } from "@/lib/use-persisted-boolean";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "sidebarCollapsed";

const itemBase =
  "flex items-center gap-3 rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

export function Sidebar() {
  const { locale, setLocale, t } = useLocale();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = usePersistedBoolean(COLLAPSE_STORAGE_KEY);
  // Manual open/close of a module's sub-sections; the active module is always open.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const isOpen = (key: string, active: boolean) => toggled[key] ?? active;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-e border-border bg-card text-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-3 border-b border-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        {collapsed ? (
          <button
            type="button"
            aria-label={t({ ar: "توسيع القائمة الجانبية", en: "Expand sidebar" })}
            onClick={() => setCollapsed(false)}
            className={cn(itemBase, "size-10 justify-center text-muted-foreground hover:bg-muted")}
          >
            <Menu className="size-5" />
          </button>
        ) : (
          <>
            <Link href="/" aria-label={t(appLabels.productName)} className="flex min-w-0 items-center gap-3">
              <BrandMark className="size-9" />
              <span className="truncate font-serif text-xl font-semibold tracking-wide">
                {t(appLabels.productName)}
              </span>
            </Link>
            <button
              type="button"
              aria-label={t({ ar: "طي القائمة الجانبية", en: "Collapse sidebar" })}
              onClick={() => setCollapsed(true)}
              className={cn(itemBase, "ms-auto size-8 justify-center text-muted-foreground hover:bg-muted")}
            >
              <Menu className="size-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-width:thin]">
        {moduleNavItems.map(({ key, href, icon: Icon, children }) => {
          const active = isWithinPath(pathname, href);
          const label = t(moduleLabels[key]);
          const open = !collapsed && Boolean(children) && isOpen(key, active);

          const rowClass = cn(
            itemBase,
            "min-w-0 flex-1 px-3 py-2.5",
            collapsed && "size-11 flex-none justify-center p-0",
            active
              ? "bg-tile-indigo-bg font-semibold text-tile-indigo"
              : "text-foreground/80 hover:bg-muted hover:text-foreground"
          );

          return (
            <div key={key}>
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger
                    disabled={!collapsed}
                    render={
                      <Link
                        href={href}
                        className={rowClass}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={cn("shrink-0", collapsed ? "size-5" : "size-[18px]")} />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </Link>
                    }
                  />
                  <TooltipContent side="inline-end">{label}</TooltipContent>
                </Tooltip>
                {!collapsed &&
                  (children ? (
                    <button
                      type="button"
                      aria-label={label}
                      aria-expanded={open}
                      onClick={() => setToggled((prev) => ({ ...prev, [key]: !open }))}
                      className={cn(itemBase, "size-8 shrink-0 justify-center text-muted-foreground hover:bg-muted")}
                    >
                      <ChevronRight
                        className={cn("size-4 transition-transform", open ? "rotate-90" : "rtl:rotate-180")}
                      />
                    </button>
                  ) : (
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center text-muted-foreground/60">
                      <ChevronRight className="size-4 rtl:rotate-180" />
                    </span>
                  ))}
              </div>

              {children && open && (
                <div className="ms-5 mt-0.5 mb-1.5 space-y-0.5 border-s border-border ps-2">
                  {children.map((child) => {
                    const childActive = isWithinPath(pathname, child.href);
                    return (
                      <div key={child.href}>
                        {child.group && (
                          <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                            {t(child.group)}
                          </p>
                        )}
                        <Link
                          href={child.href}
                          className={cn(
                            itemBase,
                            "block truncate px-3 py-1.5",
                            childActive
                              ? "bg-tile-indigo-bg font-semibold text-tile-indigo"
                              : "text-foreground/70 hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {t(child.label)}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-3">
        <FooterLink
          collapsed={collapsed}
          label={t(appLabels.settings)}
          icon={<Settings className="size-[18px]" />}
          href="/administration"
        />
        <FooterButton
          collapsed={collapsed}
          label={t(appLabels.language)}
          hint={locale === "ar" ? "EN" : "ع"}
          icon={<Languages className="size-[18px]" />}
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                title={collapsed ? t(commonLabels.notifications) : undefined}
                className={cn(
                  itemBase,
                  "w-full px-3 py-2.5 text-foreground/80 hover:bg-muted hover:text-foreground",
                  collapsed && "size-11 justify-center p-0"
                )}
              >
                <Bell className="size-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{t(commonLabels.notifications)}</span>}
              </button>
            }
          />
          <DropdownMenuContent align="start" side="top" className="w-64">
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t({ ar: "لا توجد إشعارات جديدة", en: "No new notifications" })}
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function FooterLink({
  collapsed,
  label,
  icon,
  href,
}: {
  collapsed: boolean;
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        itemBase,
        "px-3 py-2.5 text-foreground/80 hover:bg-muted hover:text-foreground",
        collapsed && "size-11 justify-center p-0"
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function FooterButton({
  collapsed,
  label,
  hint,
  icon,
  onClick,
}: {
  collapsed: boolean;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        itemBase,
        "w-full px-3 py-2.5 text-foreground/80 hover:bg-muted hover:text-foreground",
        collapsed && "size-11 justify-center p-0"
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {hint && (
            <span className="ms-auto rounded-md border border-border px-1.5 text-[11px] text-muted-foreground">
              {hint}
            </span>
          )}
        </>
      )}
    </button>
  );
}
