export const CATEGORIES = [
  { slug: "furniture", name: "Furniture" },
  { slug: "beds", name: "Beds" },
  { slug: "sofas", name: "Sofas" },
  { slug: "tables", name: "Tables" },
  { slug: "storage", name: "Storage" },
  { slug: "kitchen", name: "Kitchen" },
  { slug: "fridges", name: "Fridges" },
  { slug: "tv", name: "TV" },
  { slug: "office", name: "Office" },
  { slug: "decor", name: "Decor" },
  { slug: "household", name: "Household" },
] as const;

export type ListingCategorySlug = (typeof CATEGORIES)[number]["slug"];

export type Category = (typeof CATEGORIES)[number];

export const HOME_CATEGORY_PREVIEW_COUNT = 5;

export const HOME_CATEGORIES = CATEGORIES.slice(0, HOME_CATEGORY_PREVIEW_COUNT);

const LEGACY_CATEGORY_SLUGS: Record<string, ListingCategorySlug> = {
  chairs: "furniture",
  "kitchen-appliances": "kitchen",
  "office-furniture": "office",
  "household-equipment": "household",
};

export function normalizeCategorySlug(value: string): ListingCategorySlug | null {
  const slug = value.trim().toLowerCase();
  if (CATEGORIES.some((category) => category.slug === slug)) {
    return slug as ListingCategorySlug;
  }

  return LEGACY_CATEGORY_SLUGS[slug] ?? null;
}

export function getCategoryName(value: string): string {
  const normalized = normalizeCategorySlug(value);
  if (!normalized) {
    return value;
  }

  return CATEGORIES.find((category) => category.slug === normalized)?.name ?? value;
}

export function isListingCategorySlug(value: string): value is ListingCategorySlug {
  return normalizeCategorySlug(value) !== null;
}

export function listingMatchesCategory(
  listingCategory: string,
  filter: ListingCategorySlug | "All",
): boolean {
  if (filter === "All") {
    return true;
  }

  return normalizeCategorySlug(listingCategory) === filter;
}

export const DISALLOWED_ITEMS = [
  "Cars",
  "Phones",
  "Land",
  "Jobs",
  "Services",
  "Animals",
  "Weapons",
  "Crypto",
  "Food",
] as const;
