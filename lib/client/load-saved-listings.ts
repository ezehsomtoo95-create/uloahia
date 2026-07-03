"use client";

import { createClient } from "@/lib/supabase/client";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";
import { fetchAuthenticatedSavedListingIds } from "@/lib/client/saved-listings-auth";
import type { Listing } from "@/lib/types";
import { formatSavedTime } from "@/lib/utils/format";
import { formatSupabaseError } from "@/lib/utils/supabase-error";
import { resolveListingImageUrl } from "@/lib/utils/storage";

export type SavedListingItem = {
  listing: Listing;
  savedAt: string;
};

const LISTING_SELECT = `
  id,
  seller_id,
  title,
  category,
  condition,
  price,
  description,
  state,
  city,
  area,
  status,
  views,
  created_at,
  listing_images (
    image_url,
    position
  )
`;

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  condition: string;
  price: number | string;
  description: string;
  state: string;
  city: string;
  area: string;
  status: string;
  views: number;
  created_at: string;
  listing_images?: { image_url: string; position: number }[] | null;
};

function mapListingRow(listing: ListingRow, savedAt: string): SavedListingItem {
  const images = [...(listing.listing_images ?? [])].sort(
    (first, second) => first.position - second.position,
  );
  const imageUrl = resolveListingImageUrl(images[0]?.image_url ?? null);

  return {
    savedAt,
    listing: {
      id: listing.id,
      sellerId: listing.seller_id,
      title: listing.title,
      price: Number(listing.price),
      category: listing.category,
      state: listing.state,
      city: listing.city,
      area: listing.area,
      condition: listing.condition,
      description: listing.description,
      status: listing.status as Listing["status"],
      views: listing.views,
      verified: listing.status === "approved",
      createdAt: formatSavedTime(savedAt),
      images: images.map((image) => image.image_url),
      imageUrl,
      sellerVerified: listing.status === "approved",
    },
  };
}

export function toSavedListingItem(listing: Listing, savedAt: string): SavedListingItem {
  return {
    savedAt,
    listing: {
      ...listing,
      createdAt: formatSavedTime(savedAt),
    },
  };
}

export async function loadSavedListings(): Promise<SavedListingItem[]> {
  const supabase = createClient();
  const session = await waitForInitialAuthSession(supabase);
  const user = session?.user ?? null;

  if (!user) {
    return [];
  }

  const { savedRows, error: savedError } =
    await fetchAuthenticatedSavedListingIds(user.id);

  if (savedError) {
    console.error("[saved] saved_listings load error", formatSupabaseError(savedError));
    return [];
  }

  const ids = savedRows.map((row) => row.listing_id);
  if (ids.length === 0) {
    return [];
  }

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("id", ids)
    .in("status", ["approved", "pending"]);

  if (listingsError) {
    console.error("[saved] listings fetch error", listingsError);
    return [];
  }

  console.log("[saved] listings fetch count", listings?.length ?? 0);

  const savedAtById = new Map(
    savedRows.map((row) => [row.listing_id, row.created_at]),
  );

  return (listings ?? [])
    .map((listing) =>
      mapListingRow(listing, savedAtById.get(listing.id) ?? listing.created_at),
    )
    .sort(
      (first, second) =>
        new Date(second.savedAt).getTime() - new Date(first.savedAt).getTime(),
    );
}
