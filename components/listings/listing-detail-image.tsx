import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { getListingDetailImageUrl } from "@/lib/utils/storage";

type ListingDetailImageProps = {
  src: string;
  alt: string;
  variant?: "hero" | "thumb";
  priority?: boolean;
  className?: string;
  onError?: () => void;
  /**
   * When true, always request the thumb transform even if variant is "hero".
   * Used by the gallery for off-screen slides so we do not download every
   * full-resolution photo up front.
   */
  forceThumb?: boolean;
};

export function ListingDetailImage({
  src,
  alt,
  variant = "hero",
  priority = false,
  className,
  onError,
  forceThumb = false,
}: ListingDetailImageProps) {
  const isBlob = src.startsWith("blob:");
  const effectiveVariant = forceThumb ? "thumb" : variant;
  const optimizedSrc =
    isBlob ? src : (getListingDetailImageUrl(src, effectiveVariant) ?? src);

  if (variant === "hero") {
    return (
      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        priority={priority && !forceThumb}
        loading={priority && !forceThumb ? undefined : "lazy"}
        decoding="async"
        // Blob previews + Supabase /render/image — skip Vercel optimizer.
        unoptimized
        sizes={
          forceThumb
            ? "100vw"
            : "(max-width: 1024px) 100vw, 640px"
        }
        className={cn("object-cover object-center", className)}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={72}
      height={72}
      loading="lazy"
      decoding="async"
      unoptimized
      className={cn("size-full object-cover object-center", className)}
      onError={onError}
    />
  );
}
