const VISITOR_STORAGE_KEY = "uloahia_visitor_id";

export function getOrCreateGuestVisitorId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing?.startsWith("guest:")) {
    return existing;
  }

  const visitorId = `guest:${crypto.randomUUID()}`;
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  return visitorId;
}
