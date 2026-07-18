import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  CategoryAttributeField,
  CategoryTreeNode,
  CategoryWithCount,
} from "@/lib/types";

export type { CategoryWithCount };

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  show_condition: boolean;
};

type AttributeRow = {
  id: string;
  category_id: string;
  field_key: string;
  label: string;
  field_type: "text" | "number" | "select" | "boolean";
  options: unknown;
  required: boolean;
  sort_order: number;
  is_active: boolean;
};

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    showCondition: row.show_condition,
  };
}

function mapAttributeRow(row: AttributeRow): CategoryAttributeField {
  const options = Array.isArray(row.options)
    ? row.options.map((option) => String(option))
    : [];

  return {
    id: row.id,
    categoryId: row.category_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    options,
    required: row.required,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parentId;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }

  function childrenOf(parentId: string | null): CategoryTreeNode[] {
    return (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((category) => ({
        ...category,
        children: childrenOf(category.id),
      }));
  }

  return childrenOf(null);
}

export function flattenCategoryTree(nodes: CategoryTreeNode[]): Category[] {
  const result: Category[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenCategoryTree(node.children));
  }
  return result;
}

export function collectDescendantIds(node: CategoryTreeNode): string[] {
  const ids = [node.id];
  for (const child of node.children) {
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

export function findCategoryNode(
  nodes: CategoryTreeNode[],
  idOrSlug: string,
): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === idOrSlug || node.slug === idOrSlug) {
      return node;
    }
    const child = findCategoryNode(node.children, idOrSlug);
    if (child) {
      return child;
    }
  }
  return null;
}

export function getCategoryNameFromCatalog(
  value: string,
  catalog: Category[],
): string {
  const slug = value.trim().toLowerCase();
  return catalog.find((category) => category.slug === slug)?.name ?? value;
}

export function listingMatchesCategoryFilter(
  listingCategoryId: string | null | undefined,
  listingCategorySlug: string,
  filterSlug: string | "All",
  tree: CategoryTreeNode[],
): boolean {
  if (filterSlug === "All") {
    return true;
  }

  const filterNode = findCategoryNode(tree, filterSlug);
  if (!filterNode) {
    return listingCategorySlug === filterSlug;
  }

  const allowedIds = new Set(collectDescendantIds(filterNode));
  if (listingCategoryId && allowedIds.has(listingCategoryId)) {
    return true;
  }

  return listingCategorySlug === filterSlug;
}

async function fetchActiveCategoryRows() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, parent_id, name, slug, icon, is_featured, sort_order, is_active, show_condition",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[categories] getActiveCategories failed", error);
    return [] as CategoryRow[];
  }

  return (data ?? []) as CategoryRow[];
}

/** Request-scoped cache — dedupes category reads within a single render. */
export const getActiveCategories = cache(async () => {
  return (await fetchActiveCategoryRows()).map(mapCategoryRow);
});

export const getActiveCategoryTree = cache(async () => {
  return buildCategoryTree(await getActiveCategories());
});

/** Alias for callers that want an explicit cached tree API. */
export const getCachedCategoryTree = getActiveCategoryTree;

/**
 * Direct approved listing counts by category_id (one query), then roll up to include descendants.
 */
export const getCategoryListingCounts = cache(async (): Promise<Record<string, number>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("category_id")
    .eq("status", "approved")
    .not("category_id", "is", null);

  if (error) {
    console.error("[categories] getCategoryListingCounts failed", error);
    return {};
  }

  const direct: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.category_id as string | null;
    if (!id) continue;
    direct[id] = (direct[id] ?? 0) + 1;
  }

  const tree = await getCachedCategoryTree();
  const rolled: Record<string, number> = { ...direct };

  function rollup(node: CategoryTreeNode): number {
    let total = direct[node.id] ?? 0;
    for (const child of node.children) {
      total += rollup(child);
    }
    rolled[node.id] = total;
    return total;
  }

  for (const root of tree) {
    rollup(root);
  }

  return rolled;
});

export const getCachedCategoryListingCounts = getCategoryListingCounts;

export async function getParentCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const [tree, counts] = await Promise.all([
    getCachedCategoryTree(),
    getCachedCategoryListingCounts(),
  ]);

  function withCounts(node: CategoryTreeNode): CategoryWithCount {
    return {
      ...node,
      listingCount: counts[node.id] ?? 0,
      children: node.children.map(withCounts),
    };
  }

  const parents = tree.map(withCounts);
  return [...parents].sort(
    (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Canonical discovery catalog used by Home, Browse, and All Categories.
 * Same parents, order, counts, and children everywhere.
 */
export async function getDiscoveryCategories() {
  return getParentCategoriesWithCounts();
}

/**
 * @deprecated Prefer getDiscoveryCategories / getParentCategoriesWithCounts
 */
export async function getHomepageParentCategories(limit = 15) {
  const parents = await getParentCategoriesWithCounts();
  return parents.slice(0, limit);
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, parent_id, name, slug, icon, is_featured, sort_order, is_active, show_condition",
    )
    .eq("slug", slug.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCategoryRow(data as CategoryRow);
}

export async function getAttributeSchema(categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_attribute_schemas")
    .select(
      "id, category_id, field_key, label, field_type, options, required, sort_order, is_active",
    )
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[categories] getAttributeSchema failed", error);
    return [];
  }

  return ((data ?? []) as AttributeRow[]).map(mapAttributeRow);
}

export async function getAllAttributeSchemas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_attribute_schemas")
    .select(
      "id, category_id, field_key, label, field_type, options, required, sort_order, is_active",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[categories] getAllAttributeSchemas failed", error);
    return [];
  }

  return ((data ?? []) as AttributeRow[]).map(mapAttributeRow);
}
