const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/listing-images/";

export type ListingListImageVariant = "grid" | "row";
export type ListingDetailImageVariant = "hero" | "thumb";

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

/** Public storage URL for list cards (uploads are pre-optimized server-side). */
export function getListingListImageUrl(
  url: string | null | undefined,
  _variant: ListingListImageVariant = "grid",
) {
  return resolveListingImageUrl(url);
}

/** Public storage URL for listing detail views. */
export function getListingDetailImageUrl(
  url: string | null | undefined,
  _variant: ListingDetailImageVariant = "hero",
) {
  return resolveListingImageUrl(url);
}
