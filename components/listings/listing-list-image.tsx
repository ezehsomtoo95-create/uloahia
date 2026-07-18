import Image from "next/image";
import {
  getListingListImageUrl,
  type ListingListImageVariant,
} from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";

const VARIANT_SIZES: Record<ListingListImageVariant, string> = {
  grid: "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px",
  row: "120px",
};

export function ListingListImage({
  src,
  alt,
  variant,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  variant: ListingListImageVariant;
  className?: string;
  priority?: boolean;
}) {
  const optimizedSrc = getListingListImageUrl(src, variant);

  if (!optimizedSrc) {
    return null;
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      fill
      sizes={VARIANT_SIZES[variant]}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={cn("object-cover object-center", className)}
    />
  );
}
