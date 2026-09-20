"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpenCheck,
  Building2,
  ClipboardList,
  Languages,
  Moon,
  Sun,
  User,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { useRole, type Role } from "@/components/role-provider";
import { BrandMark } from "@/components/shell/brand-mark";
import { Button } from "@/components/ui/button";
import {
  appLabels,
  commonLabels,
  loginLabels,
  roleDescriptions,
  roleLabels,
} from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

const roleIcons: Record<Role, LucideIcon> = {
  hrManager: UserCog,
  payrollOfficer: ClipboardList,
  financeAccountant: BookOpenCheck,
  deptHead: Building2,
  employee: User,
};

export default function LoginPage() {
  const { locale, setLocale, t } = useLocale();
  const { role, setRole } = useRole();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  function handleSelect(next: Role) {
    setRole(next);
    router.push("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-launcher-wash bg-background p-6">
      <div className="absolute end-4 top-4 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t(appLabels.language)}
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        >
          <Languages className="size-[18px]" />
        </Button>
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
      </div>

      <main className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* Fixed white card so the black wordmark/linework stays readable in dark mode. */}
          <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
            <BrandMark className="size-20 shadow-none ring-0" />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-wide">
            {t(appLabels.productName)}
          </span>
        </div>

        <h1 className="mb-1 text-center text-lg font-semibold text-foreground">
          {t(loginLabels.title)}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t(loginLabels.subtitle)}</p>

        <div className="space-y-2">
          {(Object.keys(roleLabels) as Role[]).map((key) => {
            const Icon = roleIcons[key];
            const active = role === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-brand-gradient text-white"
                    : "border-border hover:bg-muted"
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{t(roleLabels[key])}</span>
                  <span
                    className={cn(
                      "text-xs",
                      active ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {t(roleDescriptions[key])}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t(loginLabels.mockNotice)}</p>
      </main>
    </div>
  );
}
