const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/listing-images/";

export type ListingListImageVariant = "grid" | "row";
export type ListingDetailImageVariant = "hero" | "thumb";

const LIST_IMAGE_SIZES: Record<ListingListImageVariant, { width: number; height: number }> =
  {
    grid: { width: 400, height: 400 },
    row: { width: 240, height: 240 },
  };

const DETAIL_IMAGE_SIZES: Record<ListingDetailImageVariant, { width: number; height: number }> =
  {
    hero: { width: 900, height: 900 },
    thumb: { width: 144, height: 144 },
  };

export function resolveListingImageUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (!SUPABASE_URL) {
    return trimmed;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");

  if (withoutLeadingSlash.startsWith("storage/v1/object/public/listing-images/")) {
    return `${SUPABASE_URL}/${withoutLeadingSlash}`;
  }

  if (withoutLeadingSlash.startsWith("listing-images/")) {
    return `${SUPABASE_URL}/storage/v1/object/public/${withoutLeadingSlash}`;
  }

  return `${SUPABASE_URL}${PUBLIC_OBJECT_PREFIX}${withoutLeadingSlash}`;
}

export function resolveListingImages(urls: string[]) {
  return urls
    .map((url) => resolveListingImageUrl(url))
    .filter((url): url is string => Boolean(url));
}

function toSupabaseRenderUrl(
  resolvedUrl: string,
  variant: ListingListImageVariant,
) {
  const objectMatch = resolvedUrl.match(/^(.+\/storage\/v1)\/object\/public\/(.+)$/);
  if (!objectMatch) {
    return null;
  }

  const { width, height } = LIST_IMAGE_SIZES[variant];
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    resize: "cover",
    format: "webp",
  });

  return `${objectMatch[1]}/render/image/public/${objectMatch[2]}?${params.toString()}`;
}

/** WebP thumbnail for Home/Browse list views; falls back to the original URL. */
export function getListingListImageUrl(
  url: string | null | undefined,
  variant: ListingListImageVariant = "grid",
) {
  const resolved = resolveListingImageUrl(url);
  if (!resolved) {
    return null;
  }

  return toSupabaseRenderUrl(resolved, variant) ?? resolved;
}

/** Optimized image for listing detail hero/thumb views. */
export function getListingDetailImageUrl(
  url: string | null | undefined,
  variant: ListingDetailImageVariant = "hero",
) {
  const resolved = resolveListingImageUrl(url);
  if (!resolved) {
    return null;
  }

  const objectMatch = resolved.match(/^(.+\/storage\/v1)\/object\/public\/(.+)$/);
  if (!objectMatch) {
    return resolved;
  }

  const { width, height } = DETAIL_IMAGE_SIZES[variant];
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    resize: "cover",
    format: "webp",
  });

  return `${objectMatch[1]}/render/image/public/${objectMatch[2]}?${params.toString()}`;
}
