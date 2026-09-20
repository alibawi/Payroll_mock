"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { useRole, type Role } from "@/components/role-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { commonLabels, roleLabels } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

/** Topbar user block: shows the current mock role and lets the demo switch to another one. */
export function RoleSwitcher() {
  const { t } = useLocale();
  const { role, setRole, clearRole } = useRole();
  const router = useRouter();

  if (!role) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        {t(commonLabels.login)}
      </Link>
    );
  }

  const label = t(roleLabels[role]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`${label} — ${t(commonLabels.switchRole)}`}
            className="flex items-center gap-2.5 rounded-lg p-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative">
              <Avatar>
                <AvatarFallback className="bg-brand-gradient font-semibold text-white">
                  {label.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full bg-secondary-green ring-2 ring-card" />
            </span>
            <span className="hidden flex-col items-start leading-tight text-start sm:flex">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[11px] text-muted-foreground">{t(commonLabels.switchRole)}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t(commonLabels.switchRole)}
        </p>
        <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
          {(Object.keys(roleLabels) as Role[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {t(roleLabels[key])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            clearRole();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          {t(commonLabels.logout)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
