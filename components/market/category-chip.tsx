"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function categoryChipClassName(active?: boolean, className?: string) {
  return cn(
    "category-chip snap-start",
    active && "category-chip-active",
    className,
  );
}

export function CategoryChip({
  active,
  children,
  className,
  onClick,
  href,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const classes = categoryChipClassName(active, className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function CategoryChipRow({
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
