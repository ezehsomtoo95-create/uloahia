export const GUEST_SAVED_STORAGE_KEY = "savedListings";
const LEGACY_GUEST_SAVED_STORAGE_KEY = "uloahia_saved_listings";

export type GuestSavedListingSnapshot = {
  id: string;
  title: string;
  price: number;
  area: string;
  city: string;
  condition: string;
  imageUrl?: string | null;
  verified?: boolean;
  views?: number;
};

export type GuestSavedEntry = {
  listingId: string;
  savedAt: string;
  listing?: GuestSavedListingSnapshot;
};

function migrateLegacyGuestSavedListings() {
  if (typeof window === "undefined") {
    return;
  }

  const current = window.localStorage.getItem(GUEST_SAVED_STORAGE_KEY);
  if (current) {
    return;
  }

  const legacy = window.localStorage.getItem(LEGACY_GUEST_SAVED_STORAGE_KEY);
  if (!legacy) {
    return;
  }

  window.localStorage.setItem(GUEST_SAVED_STORAGE_KEY, legacy);
  window.localStorage.removeItem(LEGACY_GUEST_SAVED_STORAGE_KEY);
}

function readGuestSavedListings(): GuestSavedEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  migrateLegacyGuestSavedListings();

  try {
    const raw = window.localStorage.getItem(GUEST_SAVED_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as GuestSavedEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry) =>
        typeof entry?.listingId === "string" &&
        typeof entry?.savedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeGuestSavedListings(entries: GuestSavedEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_SAVED_STORAGE_KEY, JSON.stringify(entries));
}

export function getGuestSavedListings(): GuestSavedEntry[] {
  return readGuestSavedListings().sort(
    (first, second) =>
      new Date(second.savedAt).getTime() - new Date(first.savedAt).getTime(),
  );
}

export function getGuestSavedListingIds(): string[] {
  return getGuestSavedListings().map((entry) => entry.listingId);
}

export function isGuestListingSaved(listingId: string) {
  return getGuestSavedListings().some((entry) => entry.listingId === listingId);
}

export function toggleGuestSavedListing(
  listingId: string,
  listing?: GuestSavedListingSnapshot,
) {
  const entries = readGuestSavedListings();
  const existingIndex = entries.findIndex(
    (entry) => entry.listingId === listingId,
  );

  if (existingIndex >= 0) {
    entries.splice(existingIndex, 1);
    writeGuestSavedListings(entries);
    return { saved: false };
  }

  entries.push({
    listingId,
    savedAt: new Date().toISOString(),
    listing,
  });
  writeGuestSavedListings(entries);
  return { saved: true };
}

export function clearGuestSavedListings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_SAVED_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_GUEST_SAVED_STORAGE_KEY);
}

export function getGuestSavedAt(listingId: string) {
  return getGuestSavedListings().find((entry) => entry.listingId === listingId)
    ?.savedAt;
}

export function toGuestSavedListingSnapshot(listing: {
  id: string;
  title: string;
  price: number;
  area: string;
  city: string;
  condition: string;
  imageUrl?: string | null;
  verified?: boolean;
  views?: number;
}): GuestSavedListingSnapshot {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    area: listing.area,
    city: listing.city,
    condition: listing.condition,
    imageUrl: listing.imageUrl ?? null,
    verified: listing.verified,
    views: listing.views,
  };
}
