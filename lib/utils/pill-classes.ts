import { cn } from "@/lib/utils/cn";

export function pillClassName(active?: boolean, className?: string) {
  return cn(
    "type-btn inline-flex shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-normal leading-none shadow-soft transition duration-app active:scale-[0.98]",
    active
      ? "border-primary/30 bg-primary/10 text-primary"
      : "text-muted",
    className,
  );
}

export function pillButtonClassName(active?: boolean, className?: string) {
  return cn(
    pillClassName(active, className),
    "m-0 min-h-0 cursor-pointer appearance-none font-[inherit]",
  );
}
