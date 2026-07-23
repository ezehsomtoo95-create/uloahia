import { BRAND_NAME, BRAND_TAGLINE, DOMAIN } from "@/lib/constants/brand";
import { formatListingLocation, formatNaira, sanitizeListingTitle } from "@/lib/utils/format";
import { getListingSharePreviewImageUrl } from "@/lib/utils/storage";

export type ListingShareInput = {
  id: string;
  title: string;
  price: number;
  area: string;
  city: string;
  /** Absolute or site-relative image URL for OG / previews. */
  imageUrl?: string | null;
};

export type ListingShareContent = {
  title: string;
  priceLabel: string;
  locationLabel: string;
  url: string;
  text: string;
  imageUrl: string | null;
};

const APP_ORIGIN = `https://${DOMAIN}`;
const DEFAULT_SHARE_IMAGE = `${APP_ORIGIN}/icons/icon-512x512.png`;

export function getListingShareUrl(listingId: string, origin = APP_ORIGIN) {
  const base = origin.replace(/\/+$/, "");
  return `${base}/listing/${listingId}`;
}

export function getDefaultListingShareImage() {
  return DEFAULT_SHARE_IMAGE;
}

export function resolveListingShareImage(imageUrl?: string | null) {
  if (!imageUrl?.trim()) {
    return DEFAULT_SHARE_IMAGE;
  }

  const preview = getListingSharePreviewImageUrl(imageUrl);
  if (preview) {
    return preview;
  }

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${APP_ORIGIN}${trimmed}`;
  }

  return trimmed;
}

export function buildListingShareMessage(input: {
  title: string;
  price: number;
  area: string;
  city: string;
  url: string;
}) {
  const title = sanitizeListingTitle(input.title);
  const priceLabel = formatNaira(input.price);
  const locationLabel = formatListingLocation(input.area, input.city, 80);

  return [
    `📱 ${title}`,
    `💰 ${priceLabel}`,
    `📍 ${locationLabel}`,
    "",
    `View this listing on ${BRAND_NAME}:`,
    input.url,
    "",
    BRAND_TAGLINE,
  ].join("\n");
}

export function buildListingShareContent(
  listing: ListingShareInput,
  origin = typeof window !== "undefined" ? window.location.origin : APP_ORIGIN,
): ListingShareContent {
  const title = sanitizeListingTitle(listing.title);
  const priceLabel = formatNaira(listing.price);
  const locationLabel = formatListingLocation(listing.area, listing.city, 80);
  const url = getListingShareUrl(listing.id, origin);
  const text = buildListingShareMessage({
    title,
    price: listing.price,
    area: listing.area,
    city: listing.city,
    url,
  });

  return {
    title,
    priceLabel,
    locationLabel,
    url,
    text,
    imageUrl: listing.imageUrl ? resolveListingShareImage(listing.imageUrl) : null,
  };
}

export function canUseNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareListingNative(content: ListingShareContent) {
  if (!canUseNativeShare()) {
    return { ok: false as const, reason: "unsupported" as const };
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.text,
      url: content.url,
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false as const, reason: "aborted" as const };
    }

    return { ok: false as const, reason: "failed" as const, error };
  }
}

export function getWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getFacebookShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function getXShareUrl(text: string, url: string) {
  const params = new URLSearchParams({
    text,
    url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getTelegramShareUrl(url: string, text: string) {
  const params = new URLSearchParams({
    url,
    text,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export async function copyListingLink(url: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}
