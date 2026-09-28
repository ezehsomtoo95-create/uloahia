const VIEWED_COMMUNITY_COOKIE_PREFIX = "community_viewed_";

export function getViewedCommunityPostCookieName(postId: string) {
  return `${VIEWED_COMMUNITY_COOKIE_PREFIX}${postId}`;
}

export function hasViewedCommunityPostCookie(postId: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const cookieName = getViewedCommunityPostCookieName(postId);
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${cookieName}=`));
}

export function markCommunityPostViewedCookie(postId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const cookieName = getViewedCommunityPostCookieName(postId);
  document.cookie = `${cookieName}=1; path=/; samesite=lax`;
}