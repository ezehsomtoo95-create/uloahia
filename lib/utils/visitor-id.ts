const VISITOR_COOKIE_NAME = "uloahia_visitor_id";
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!entry) {
    return null;
  }

  return decodeURIComponent(entry.slice(name.length + 1));
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; samesite=lax; max-age=${VISITOR_COOKIE_MAX_AGE_SECONDS}`;
}

export function getOrCreateVisitorId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = readCookie(VISITOR_COOKIE_NAME);
  if (existing?.length) {
    return existing;
  }

  const legacy = window.localStorage.getItem(VISITOR_COOKIE_NAME);
  if (legacy?.length) {
    writeCookie(VISITOR_COOKIE_NAME, legacy);
    return legacy;
  }

  const visitorId = `guest:${crypto.randomUUID()}`;
  writeCookie(VISITOR_COOKIE_NAME, visitorId);
  window.localStorage.setItem(VISITOR_COOKIE_NAME, visitorId);
  return visitorId;
}

export const getOrCreateGuestVisitorId = getOrCreateVisitorId;
