import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import type { StatusTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const iconToneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary dark:bg-primary/25 dark:text-tile-indigo",
  success: "bg-secondary-green/15 text-secondary-green",
  warning: "bg-secondary-orange/15 text-secondary-orange",
  destructive: "bg-destructive/10 text-destructive",
};

const accentBarClasses: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/25",
  info: "bg-primary",
  success: "bg-secondary-green",
  warning: "bg-secondary-orange",
  destructive: "bg-destructive",
};

const trendToneClasses: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-secondary-green",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

export interface KPITrend {
  /** Signed change vs the previous period (e.g. 12 or -8) — drives the arrow direction and colour. */
  value: number;
  /** Full text shown next to the arrow, e.g. "+12% vs previous period". */
  label: string;
  /** Which direction is "good" for this KPI (default "up"; use "down" for e.g. lateness). */
  goodDirection?: "up" | "down";
}

function trendTone(trend: KPITrend): "positive" | "negative" | "neutral" {
  if (trend.value === 0) return "neutral";
  const isUp = trend.value > 0;
  const isGood = (trend.goodDirection ?? "up") === "up" ? isUp : !isUp;
  return isGood ? "positive" : "negative";
}

// Long text values (employee / department names) look distorted in the big numeric font,
// so they are shrunk and allowed two lines instead of stretching the card.
function isLongTextValue(value: string | number): boolean {
  return typeof value === "string" && value.length > 10;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  description,
  className,
  tone = "info",
  progress,
  trend,
}: {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  /** Quick semantic colour for the KPI state (same scale as StatusBadge). */
  tone?: StatusTone;
  /** 0–100, rendered as a thin progress bar at the bottom (for ratio / rate KPIs). */
  progress?: number;
  trend?: KPITrend;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-4",
        className
      )}
    >
      <span className={cn("absolute inset-y-0 start-0 w-1", accentBarClasses[tone])} aria-hidden />

      {Icon && (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            iconToneClasses[tone]
          )}
        >
          <Icon className="size-4.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">{title}</p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p
            className={cn(
              "font-semibold tabular-nums text-foreground",
              isLongTextValue(value) ? "line-clamp-2 text-base leading-snug" : "text-2xl"
            )}
          >
            {value}
          </p>
          {trend && (
            <span
              dir="auto"
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trendToneClasses[trendTone(trend)]
              )}
            >
              {trend.value >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.label}
            </span>
          )}
        </div>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
        {typeof progress === "number" && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", accentBarClasses[tone])}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
