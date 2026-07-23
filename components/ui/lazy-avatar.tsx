"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Small avatar that always lazy-loads and serves a fixed pixel budget
 * (avoids downloading full-size profile photos in grids/lists).
 */
export function LazyAvatar({
  src,
  alt = "",
  size = 40,
  className,
  fallback,
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}) {
  if (!src) {
    return (
      <span
        className={cn("inline-flex items-center justify-center overflow-hidden", className)}
        style={{ width: size, height: size }}
        aria-hidden={alt ? undefined : true}
      >
        {fallback}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      loading="lazy"
      decoding="async"
      // Profile avatars are remote (often Supabase); avoid Vercel transforms.
      unoptimized
      className={cn("object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
