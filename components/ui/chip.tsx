"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function chipClassName(
  active?: boolean,
  className?: string,
  size: "default" | "sm" | "category" = "default",
) {
  return cn(
    size === "sm" ? "chip-sm" : size === "category" ? "chip-category" : "chip-default",
    "snap-start",
    active && "chip-active",
    className,
  );
}

export function Chip({
  active,
  children,
  className,
  onClick,
  href,
  size = "default",
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  size?: "default" | "sm" | "category";
}) {
  const classes = chipClassName(active, className, size);

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

export function BrowseScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "browse-scroll-row -mx-4 w-[calc(100%+2rem)] touch-pan-x overflow-x-auto scroll-smooth",
        className,
      )}
    >
      <div className="flex w-max snap-x snap-mandatory flex-nowrap items-center gap-2 px-4 pb-0.5">
        {children}
      </div>
    </div>
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
