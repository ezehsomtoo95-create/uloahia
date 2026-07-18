/** Shared shape for the horizontal discovery strip (Home, Browse, etc.). */
export type CategoryDiscoveryItem = {
  slug: string;
  name: string;
  icon?: string | null;
  listingCount?: number;
};

type DiscoveryParent = {
  slug: string;
  name: string;
  icon?: string | null;
  listingCount?: number;
  isFeatured: boolean;
  sortOrder: number;
};

/** Canonical All Categories explorer. */
export const CATEGORIES_INDEX_HREF = "/categories";

/**
 * Canonical parent ordering for every discovery surface.
 * Featured first → sort_order → name.
 */
export function sortParentCategoriesForDiscovery<T extends DiscoveryParent>(
  parents: T[],
): T[] {
  return [...parents].sort(
    (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name),
  );
}

export function toCategoryDiscoveryItems(
  parents: DiscoveryParent[],
): CategoryDiscoveryItem[] {
  return sortParentCategoriesForDiscovery(parents).map((category) => ({
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    listingCount: category.listingCount,
  }));
}

/**
 * Category strip / discovery taps open the All Categories overview
 * with the matching accordion section forced open via `?expand=`.
 */
export function categoryOverviewHref(slug: string) {
  return `${CATEGORIES_INDEX_HREF}?expand=${encodeURIComponent(slug)}`;
}

/** Listings marketplace for a category (after View all / subcategory pick). */
export function categoryMarketplaceHref(slug: string) {
  return `/category/${encodeURIComponent(slug)}`;
}
