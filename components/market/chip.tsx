"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function chipClassName(active?: boolean, className?: string) {
  return cn("chip-default snap-start", active && "chip-active", className);
}

export function Chip({
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
  const classes = chipClassName(active, className);

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

export function ChipRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "native-scroll -mx-3 w-[calc(100%+1.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain scroll-smooth",
        className,
      )}
    >
      <div className="flex w-max snap-x snap-mandatory flex-nowrap items-center gap-1.5 px-3 pb-0.5">
        {children}
      </div>
    </div>
  );
}
