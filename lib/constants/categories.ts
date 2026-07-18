/**
 * Catalog data (categories / locations / attributes) lives in the database.
 * These helpers only format or enforce policy — they must not hardcode marketplace catalogs.
 */

import type { CategoryTreeNode } from "@/lib/types";

export function getCategoryName(value: string, catalogNames?: Record<string, string>) {
  const slug = value.trim().toLowerCase();
  if (catalogNames?.[slug]) {
    return catalogNames[slug];
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeCategorySlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return slug.length > 0 ? slug : null;
}

export function listingMatchesCategory(
  listingCategory: string,
  filter: string | "All",
): boolean {
  if (filter === "All") {
    return true;
  }

  return normalizeCategorySlug(listingCategory) === normalizeCategorySlug(filter);
}

export function findCategoryNodeBySlug(
  nodes: CategoryTreeNode[],
  slug: string,
): CategoryTreeNode | null {
  const needle = slug.trim().toLowerCase();
  for (const node of nodes) {
    if (node.slug === needle) {
      return node;
    }
    const child = findCategoryNodeBySlug(node.children, needle);
    if (child) {
      return child;
    }
  }
  return null;
}

function collectDescendantSlugsAndIds(node: CategoryTreeNode): {
  slugs: Set<string>;
  ids: Set<string>;
} {
  const slugs = new Set<string>();
  const ids = new Set<string>();

  function walk(current: CategoryTreeNode) {
    slugs.add(current.slug);
    ids.add(current.id);
    for (const child of current.children) {
      walk(child);
    }
  }

  walk(node);
  return { slugs, ids };
}

/** Match listing against a category filter, including all descendants in the tree. */
export function listingMatchesCategoryInTree(
  listingCategoryId: string | null | undefined,
  listingCategorySlug: string,
  filterSlug: string | "All",
  tree: CategoryTreeNode[],
): boolean {
  if (filterSlug === "All") {
    return true;
  }

  const filterNode = findCategoryNodeBySlug(tree, filterSlug);
  if (!filterNode) {
    return listingMatchesCategory(listingCategorySlug, filterSlug);
  }

  const { slugs, ids } = collectDescendantSlugsAndIds(filterNode);
  if (listingCategoryId && ids.has(listingCategoryId)) {
    return true;
  }

  const listingSlug = normalizeCategorySlug(listingCategorySlug);
  return listingSlug ? slugs.has(listingSlug) : false;
}

/** Truly prohibited marketplace items (not vertical categories). */
export const DISALLOWED_ITEMS = [
  "Weapons",
  "Crypto",
  "Stolen goods",
  "Counterfeit documents",
] as const;
