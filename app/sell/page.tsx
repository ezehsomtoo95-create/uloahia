import { SellPageClient } from "@/components/sell/sell-page-client";
import {
  getActiveCategoryTree,
  getAllAttributeSchemas,
} from "@/lib/data/categories";
import {
  getActiveLocationTree,
  getDefaultSellLocation,
} from "@/lib/data/locations";

export default async function SellPage() {
  const [categoryTree, attributeSchemas, locationTree, defaultLocation] =
    await Promise.all([
      getActiveCategoryTree(),
      getAllAttributeSchemas(),
      getActiveLocationTree(),
      getDefaultSellLocation(),
    ]);

  return (
    <SellPageClient
      categoryTree={categoryTree}
      attributeSchemas={attributeSchemas}
      locationTree={locationTree}
      defaultLocation={defaultLocation}
    />
  );
}
