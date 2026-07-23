const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/listing-images/";

export type ListingListImageVariant = "grid" | "row";
export type ListingDetailImageVariant = "hero" | "thumb";

/** Card thumbnails — display ~110–220px; request 2× for retina, never originals. */
const LIST_IMAGE_SIZES: Record<
  ListingListImageVariant,
  { width: number; height: number; quality: number }
> = {
  grid: { width: 400, height: 400, quality: 78 },
  row: { width: 240, height: 240, quality: 76 },
};

/** Detail hero for mobile full-bleed / desktop ~640px column; thumbs for strip. */
const DETAIL_IMAGE_SIZES: Record<
  ListingDetailImageVariant,
  { width: number; height: number; quality: number }
> = {
  hero: { width: 900, height: 900, quality: 80 },
  thumb: { width: 144, height: 144, quality: 72 },
};

/** Open Graph / social share preview (crawlers fetch once; keep moderate). */
const SHARE_PREVIEW = { width: 1200, height: 1200, quality: 80 };

const STORAGE_PUBLIC_PATH =
  /^(.+\/storage\/v1)\/(?:object|render\/image)\/public\/([^?]+)(?:\?.*)?$/;

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
  options: { width: number; height: number; quality: number; resize?: "cover" | "contain" },
) {
  const match = resolvedUrl.match(STORAGE_PUBLIC_PATH);
  if (!match) {
    return null;
  }

  const params = new URLSearchParams({
    width: String(options.width),
    height: String(options.height),
    resize: options.resize ?? "cover",
    format: "webp",
    quality: String(options.quality),
  });

  return `${match[1]}/render/image/public/${match[2]}?${params.toString()}`;
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

  return toSupabaseRenderUrl(resolved, LIST_IMAGE_SIZES[variant]) ?? resolved;
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

  return toSupabaseRenderUrl(resolved, DETAIL_IMAGE_SIZES[variant]) ?? resolved;
}

/** Absolute WebP preview for OG / Twitter / share sheets (not originals). */
export function getListingSharePreviewImageUrl(url: string | null | undefined) {
  const resolved = resolveListingImageUrl(url);
  if (!resolved) {
    return null;
  }

  return toSupabaseRenderUrl(resolved, SHARE_PREVIEW) ?? resolved;
}

/**
 * Avatar / profile photo via Supabase render when stored in a public bucket.
 * `displaySize` is CSS px; requests 2× for retina, capped.
 */
export function getAvatarImageUrl(url: string | null | undefined, displaySize = 40) {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();
  const edge = Math.min(Math.max(Math.round(displaySize * 2), 48), 256);

  return (
    toSupabaseRenderUrl(trimmed, {
      width: edge,
      height: edge,
      quality: 75,
      resize: "cover",
    }) ?? trimmed
  );
}
