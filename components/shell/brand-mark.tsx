import { cn } from "@/lib/utils";

/**
 * ENKI emblem cropped out of public/brand/logo-main.png (the file is a padded square with the
 * wordmark below the emblem). Always sits on a fixed white card so the black linework stays
 * readable in dark mode.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="ENKI"
      className={cn(
        "block shrink-0 rounded-xl bg-white bg-[url(/brand/logo-main.png)] bg-[length:374%_auto] bg-[position:47.6%_37%] bg-no-repeat shadow-sm ring-1 ring-black/5",
        className
      )}
    />
  );
}
