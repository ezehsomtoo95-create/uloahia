"use client";

import { cn } from "@/lib/utils/cn";

export function FilterChip({
  active,
  children,
  className,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "filter-chip snap-start",
        active && "filter-chip-active",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FilterChipRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "native-scroll -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto overscroll-x-contain scroll-smooth touch-pan-x",
        className,
      )}
    >
      <div className="flex w-max min-w-full snap-x snap-mandatory flex-nowrap items-center gap-1.5 px-3 pb-0.5">
        {children}
      </div>
    </div>
  );
}
