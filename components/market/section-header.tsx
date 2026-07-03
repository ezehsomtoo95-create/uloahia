import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function SectionHeader({
  title,
  href,
  actionLabel,
  className,
  compact = false,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        compact ? "mb-2" : "mb-2.5",
        className,
      )}
    >
      <h2 className="type-section-title">{title}</h2>
      {href && actionLabel ? (
        <Link href={href} className="type-link shrink-0 text-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
