import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryMarketplaceClient } from "@/components/category/category-marketplace-client";
import { getCategoryMarketplaceCopy } from "@/lib/constants/category-marketplace";
import {
  collectDescendantIds,
  findCategoryNode,
  getActiveCategoryTree,
  getAllAttributeSchemas,
} from "@/lib/data/categories";
import { getAllApprovedListings } from "@/lib/data/listings";
import { getActiveLocationTree } from "@/lib/data/locations";
import { mergeAttributeFieldsByKey } from "@/lib/utils/category-attributes";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tree = await getActiveCategoryTree();
  const node = findCategoryNode(tree, slug);
  if (!node) {
    return { title: "Category" };
  }
  const copy = getCategoryMarketplaceCopy(node.slug, node.name);
  return {
    title: `${node.name} marketplace`,
    description: copy.description,
  };
}

export default async function CategoryMarketplacePage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;

  const [listings, categoryTree, locationTree, allSchemas] = await Promise.all([
    getAllApprovedListings(),
    getActiveCategoryTree(),
    getActiveLocationTree(),
    getAllAttributeSchemas(),
  ]);

  const category = findCategoryNode(categoryTree, slug);
  if (!category || !category.isActive) {
    notFound();
  }

  const descendantIds = new Set(collectDescendantIds(category));
  const attributeFields = mergeAttributeFieldsByKey(
    allSchemas.filter((field) => descendantIds.has(field.categoryId)),
  );
  const copy = getCategoryMarketplaceCopy(category.slug, category.name);

  return (
    <CategoryMarketplaceClient
      category={category}
      categoryTree={categoryTree}
      eyebrow={copy.eyebrow}
      description={copy.description}
      bannerImage={copy.bannerImage}
      attributeFields={attributeFields}
      initialListings={listings}
      locationTree={locationTree}
    />
  );
}
