"use client";

import { cn } from "@/lib/utils/cn";
import { chipClassName } from "@/components/ui/chip";

export function MarketPill({
  active = false,
  children,
  className,
  onClick,
  type = "button",
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(chipClassName(active), className)}
    >
      {children}
    </button>
  );
}
