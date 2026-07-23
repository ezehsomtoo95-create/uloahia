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
};

export function ListingDetailImage({
  src,
  alt,
  variant = "hero",
  priority = false,
  className,
  onError,
}: ListingDetailImageProps) {
  const isBlob = src.startsWith("blob:");
  const optimizedSrc =
    isBlob ? src : (getListingDetailImageUrl(src, variant) ?? src);

  if (variant === "hero") {
    return (
      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        // Blob previews + Supabase /render/image — skip Vercel optimizer.
        unoptimized
        sizes="(max-width: 1024px) 100vw, 640px"
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
      unoptimized
      className={cn("size-full object-cover object-center", className)}
      onError={onError}
    />
  );
}
