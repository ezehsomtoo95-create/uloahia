"use client";

import { CategoryImageRail } from "@/components/market/category-image-rail";
import {
  CATEGORIES_INDEX_HREF,
  categoryOverviewHref,
  type CategoryDiscoveryItem,
} from "@/lib/categories/discovery";

type CategoryDiscoveryStripProps = {
  categories: CategoryDiscoveryItem[];
  size?: "sm" | "md" | "lg";
};

/**
 * One reusable category strip for Home, Browse, guest, and signed-in.
 * Always: All → /categories, tiles → /categories?expand=<slug>, footer link → /categories.
 */
export function CategoryDiscoveryStrip({
  categories,
  size = "sm",
}: CategoryDiscoveryStripProps) {
  return (
    <CategoryImageRail
      categories={categories}
      showAll
      showBrowseAllLink
      size={size}
      allHref={CATEGORIES_INDEX_HREF}
      categoryHref={categoryOverviewHref}
    />
  );
}
