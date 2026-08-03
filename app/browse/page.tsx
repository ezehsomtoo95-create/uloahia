import { BrowsePageClient } from "@/components/browse/browse-page-client";
import { getDiscoveryCategories } from "@/lib/data/categories";
import { getAllApprovedListings } from "@/lib/data/listings";
import { getActiveLocationTree } from "@/lib/data/locations";
import { toCategoryDiscoveryItems } from "@/lib/categories/discovery";
import { BRAND_NAME } from "@/lib/constants/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse Marketplace",
  description: `Explore all listings on ${BRAND_NAME}. Find phones, cars, property, jobs, fashion, and more from sellers near you.`,
  keywords: ["browse", "listings", "marketplace", "buy", "Nigeria"],
  alternates: {
    canonical: "/browse",
  },
};

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
