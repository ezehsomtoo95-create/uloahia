import { BrowsePageClient } from "@/components/browse/browse-page-client";
import { getAllApprovedListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const listings = await getAllApprovedListings();

  return <BrowsePageClient initialListings={listings} />;
}
