"use client";

import Link from "next/link";
import { chipClassName } from "@/components/ui/chip";

/** @deprecated Use Chip from @/components/ui/chip */
export function Pill({
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

/** @deprecated Use ChipRow from @/components/ui/chip */
export { ChipRow as PillRow } from "@/components/ui/chip";
