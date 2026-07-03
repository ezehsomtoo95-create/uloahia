"use client";

let savedIdsCache: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

export function invalidateSavedListingsCache() {
  savedIdsCache = null;
  loadPromise = null;
}

export async function getCachedSavedListingIds(
  fetcher: () => Promise<string[]>,
): Promise<Set<string>> {
  if (savedIdsCache) {
    return savedIdsCache;
  }

  if (!loadPromise) {
    loadPromise = fetcher().then((ids) => {
      savedIdsCache = new Set(ids);
      return savedIdsCache;
    });
  }

  return loadPromise;
}
