const VIEWED_LISTING_COOKIE_PREFIX = "viewed_";

export function getViewedListingCookieName(listingId: string) {
  return `${VIEWED_LISTING_COOKIE_PREFIX}${listingId}`;
}

export function hasViewedListingCookie(listingId: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const cookieName = getViewedListingCookieName(listingId);
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${cookieName}=`));
}

export function markListingViewedCookie(listingId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const cookieName = getViewedListingCookieName(listingId);
  document.cookie = `${cookieName}=1; path=/; samesite=lax`;
}
