export const SAVED_LISTINGS_CHANGED_EVENT = "uloahia:saved-listings-changed";

export function notifySavedListingsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SAVED_LISTINGS_CHANGED_EVENT));
}
