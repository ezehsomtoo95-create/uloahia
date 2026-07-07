import "server-only";

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";

import type { Listing } from "@/lib/types";
import { resolveListingImages } from "@/lib/utils/storage";

type ListingImageRow = {
  image_url: string;
  position: number;
};

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
  status: "pending" | "approved" | "rejected" | "sold";
  views: number;
  created_at: string;
  listing_images?: ListingImageRow[] | null;
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

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getApprovedListings(limit = 24) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const listings = (data as ListingRow[]).map(mapListingRow);

  return Promise.all(
    listings.map((listing) => attachListingImages(supabase, listing.id, listing)),
  );
}

export async function getAllApprovedListings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const listings = (data as ListingRow[]).map(mapListingRow);

  return Promise.all(
    listings.map((listing) => attachListingImages(supabase, listing.id, listing)),
  );
}

export async function getApprovedListingById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapListingRow(data as ListingRow);
}

export async function getListingForViewer(id: string) {
  const supabase = await createClient();
  const approved = await getApprovedListingById(id);
  if (approved) {
    return attachListingImages(supabase, id, approved);
  }

  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const listing = mapListingRow(data as ListingRow);
  const isOwner = listing.sellerId === user.id;
  const adminAccess = await resolveAdminAccess(supabase, {
    userEmail: user.email,
  });

  if (isOwner || adminAccess.isAdmin) {

    return await attachListingImages(supabase, id, listing);
  }

  return null;
}

export async function getRelatedListings(listing: Listing, limit = 4) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "approved")
    .neq("id", listing.id)
    .or(`city.eq.${listing.city},category.eq.${listing.category}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as ListingRow[]).map(mapListingRow);
}

export async function getSellerContact(listingId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_seller_contact", {
    listing_uuid: listingId,
  });

  return typeof data === "string" ? data : null;
}

export async function getSellerPhoneBySellerId(sellerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", sellerId)
    .maybeSingle();

  return data?.phone ?? null;
}

export async function getViewerContext() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const adminAccess = await resolveAdminAccess(supabase, {
    userEmail: user.email,
  });

  return {
    user,
    isAdmin: adminAccess.isAdmin,

  };
}

export async function getSellerSoldCount(sellerId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_seller_sold_count", {
    seller_uuid: sellerId,
  });

  return typeof data === "number" ? data : 0;
}

export async function getMyListings() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.log("[my listings fetch]", { error, count: 0 });
    return [];
  }

  const listings = (data as ListingRow[]).map(mapListingRow);
  console.log(
    "[my listings fetch]",
    listings.map((listing) => ({ id: listing.id, title: listing.title })),
  );

  return listings;
}

function mapListingRow(row: ListingRow): Listing {
  const images = [...(row.listing_images ?? [])].sort(
    (first, second) => first.position - second.position,
  );
  const imageUrls = resolveListingImages(images.map((image) => image.image_url));

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    price: Number(row.price),
    category: row.category,
    state: row.state,
    city: row.city,
    area: row.area,
    condition: row.condition,
    description: row.description,
    status: row.status,
    views: row.views,
    verified: row.status === "approved",
    createdAt: formatRelativeTime(row.created_at),
    createdAtMs: new Date(row.created_at).getTime(),
    images: imageUrls,
    imageUrl: imageUrls[0] ?? null,
    sellerVerified: row.status === "approved",
  };
}

async function attachListingImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  listing: Listing,
) {
  if (listing.images.length > 0) {
    return listing;
  }

  const { data, error } = await supabase
    .from("listing_images")
    .select("image_url, position")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });

  if (error || !data?.length) {
    return listing;
  }

  const imageUrls = resolveListingImages(data.map((row) => row.image_url));

  return {
    ...listing,
    images: imageUrls,
    imageUrl: imageUrls[0] ?? null,
  };
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
