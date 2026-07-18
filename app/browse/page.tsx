import { BrowsePageClient } from "@/components/browse/browse-page-client";
import { getDiscoveryCategories } from "@/lib/data/categories";
import { getAllApprovedListings } from "@/lib/data/listings";
import { getActiveLocationTree } from "@/lib/data/locations";
import { toCategoryDiscoveryItems } from "@/lib/categories/discovery";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const [listings, discoveryCategories, locationTree] = await Promise.all([
    getAllApprovedListings(),
    getDiscoveryCategories(),
    getActiveLocationTree(),
  ]);

  return (
    <BrowsePageClient
      initialListings={listings}
      discoveryCategories={toCategoryDiscoveryItems(discoveryCategories)}
      locationTree={locationTree}
    />
  );
}
