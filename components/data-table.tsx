"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commonLabels, componentLabels } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell?: (row: T) => ReactNode;
  className?: string;
  /** Makes the column sortable; returns the comparable value for a row. */
  sortValue?: (row: T) => string | number;
};

/**
 * Shared list table: search box + filters slot, sortable columns, pagination,
 * loading / error / empty states and an optional totals footer row.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchKeys,
  searchPlaceholder,
  filters,
  pageSize = 10,
  emptyMessage,
  onRowClick,
  loading = false,
  error,
  onRetry,
  footer,
  rowClassName,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string | number;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Error message; shows the error state (with a retry button when `onRetry` is given). */
  error?: string;
  onRetry?: () => void;
  /** Cells of a totals row rendered as `<td>`s in a `<tfoot>` (must match the column count). */
  footer?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    if (!searchKeys || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [data, searchKeys, query]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    const getValue = column.sortValue;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), locale) * factor;
    });
  }, [filtered, sort, columns, locale]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null
    );
  }

  const showBody = !loading && !error;

  return (
    <div className="space-y-3">
      {(searchKeys || filters) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchKeys && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={searchPlaceholder ?? t(commonLabels.search)}
                className="ps-9"
              />
            </div>
          )}
          {filters}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "px-3 py-2.5 text-start font-medium text-muted-foreground",
                      column.className
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 outline-none hover:text-foreground focus-visible:text-foreground"
                      >
                        {column.header}
                        {active &&
                          (sort.dir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          ))}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t(commonLabels.loading)}
                  </span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="size-5 text-destructive" />
                    <p className="font-medium text-foreground">{t(componentLabels.errorTitle)}</p>
                    <p className="text-xs">{error}</p>
                    {onRetry && (
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        {t(commonLabels.retry)}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  {emptyMessage ?? t(commonLabels.noResults)}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-t border-border",
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-3 py-2.5", column.className)}>
                      {column.cell
                        ? column.cell(row)
                        : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {showBody && paged.length > 0 && footer && (
            <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
              <tr>{footer}</tr>
            </tfoot>
          )}
        </table>
      </div>

      {showBody && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            {t(componentLabels.pageOf)
              .replace("{page}", String(currentPage))
              .replace("{total}", String(totalPages))}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5 rtl:rotate-180" />
              {t(commonLabels.previous)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t(commonLabels.next)}
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
