"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import { resolveCrumbLabel } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const ChevronIcon = locale === "ar" ? ChevronLeft : ChevronRight;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: resolveCrumbLabel(href, locale) ?? decodeURIComponent(segment),
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1.5 border-b border-border bg-card/60 px-6 py-2 text-sm text-muted-foreground"
    >
      <Link
        href="/"
        aria-label={t({ ar: "الرئيسية", en: "Home" })}
        className="flex items-center hover:text-foreground"
      >
        <Home className="size-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronIcon className="size-3.5" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
