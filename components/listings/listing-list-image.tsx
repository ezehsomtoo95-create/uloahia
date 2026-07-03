import Image from "next/image";
import {
  getListingListImageUrl,
  type ListingListImageVariant,
} from "@/lib/utils/storage";

const VARIANT_CONFIG: Record<
  ListingListImageVariant,
  { width: number; height: number; sizes: string }
> = {
  grid: {
    width: 400,
    height: 400,
    sizes: "(max-width: 640px) 45vw, 200px",
  },
  row: {
    width: 240,
    height: 240,
    sizes: "120px",
  },
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
  const config = VARIANT_CONFIG[variant];

  if (!optimizedSrc) {
    return null;
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={config.width}
      height={config.height}
      sizes={config.sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
    />
  );
}
