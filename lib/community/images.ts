import {
  getListingListImageUrl,
  resolveListingImageUrl,
} from "@/lib/utils/storage";

/** Resolve absolute/relative community photo URLs to full public URLs. */
export function resolveCommunityImageUrl(url: string): string {
  return resolveListingImageUrl(url) ?? url;
}

/** Optimized WebP thumbnail for community post photos in feeds. */
export function getCommunityFeedImageUrl(url: string): string {
  return getListingListImageUrl(url, "grid") ?? url;
}