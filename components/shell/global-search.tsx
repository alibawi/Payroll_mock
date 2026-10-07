"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { commonLabels } from "@/lib/i18n/labels";
import { useApi } from "@/lib/payroll/api-client";

type Hit = { id: string; group: string; title: { ar: string; en: string }; subtitle: string; href: string };

const GROUPS: Record<string, { ar: string; en: string }> = {
  employee: { ar: "موظفون", en: "Employees" },
  run: { ar: "دورات الرواتب", en: "Payroll runs" },
  loan: { ar: "السلف والقروض", en: "Loans" },
  penalty: { ar: "العقوبات", en: "Penalties" },
  component: { ar: "بنود الراتب", en: "Pay components" },
  eos: { ar: "نهاية الخدمة", en: "End of service" },
};

/** Topbar search (Ctrl/Cmd + K): employees, runs, loans, penalties, components and end-of-service claims. */
export function GlobalSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useApi<{ hits: Hit[] }>(query.length >= 2 ? `/api/payroll/search?q=${encodeURIComponent(query)}` : null);

  // debounce the typed text into the query
  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const hits = results.data?.hits ?? [];
  const groups = Object.keys(GROUPS).filter((g) => hits.some((h) => h.group === g));
  const go = (href: string) => {
    setOpen(false);
    setText("");
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && hits[0]) go(hits[0].href);
        }}
        placeholder={t(commonLabels.search)}
        aria-label={t(commonLabels.search)}
        className="h-9 ps-8 pe-14"
      />
      <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">K⌘</kbd>

      {open && query.length >= 2 && (
        <div role="listbox" className="absolute start-0 top-full z-50 mt-1 max-h-96 w-[22rem] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {results.loading && <p className="px-3 py-2 text-sm text-muted-foreground">{t(commonLabels.loading)}</p>}
          {!results.loading && hits.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{t({ ar: "لا نتائج", en: "No results" })}</p>}
          {groups.map((g) => (
            <div key={g} className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase text-muted-foreground">{t(GROUPS[g])}</p>
              {hits.filter((h) => h.group === g).map((h) => (
                <button key={h.id} type="button" role="option" aria-selected={false} onClick={() => go(h.href)} className="flex w-full flex-col items-start rounded-lg px-3 py-1.5 text-start hover:bg-muted">
                  <span className="text-sm font-medium">{t(h.title)}</span>
                  <span className="text-xs text-muted-foreground">{h.subtitle}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
