import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TimelineItem = {
  id: string | number;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: string;
  icon?: LucideIcon;
};

/** Vertical event list used for activity logs / audit trails on every detail screen. */
export function Timeline({
  items,
  emptyMessage,
}: {
  items: TimelineItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="relative ps-9">
            {index !== items.length - 1 && (
              <span
                aria-hidden
                className="absolute start-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border"
              />
            )}
            <span className="absolute start-0 top-0 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/25 dark:text-tile-indigo">
              {Icon ? (
                <Icon className="size-4" />
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.timestamp && (
                <p className="text-xs text-muted-foreground">{item.timestamp}</p>
              )}
            </div>
            {item.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
