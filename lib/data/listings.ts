import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";

import type { Listing } from "@/lib/types";
import { sanitizeListingTitle } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";
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
  category_id?: string | null;
  attributes?: Record<string, unknown> | null;
  condition: string;
  price: number | string;
  description: string;
  country?: string | null;
  country_id?: string | null;
  state_id?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  state: string;
  city: string;
  area: string;
  status: "pending" | "approved" | "rejected" | "sold";
  views: number;
  is_featured?: boolean | null;
  created_at: string;
  listing_images?: ListingImageRow[] | null;
  categories?:
    | { id: string; name: string; slug: string }
    | Array<{ id: string; name: string; slug: string }>
    | null;
};

const LISTING_SELECT = `
  id,
  seller_id,
  title,
  category,
  category_id,
  attributes,
  condition,
  price,
  description,
  country,
  country_id,
  state_id,
  city_id,
  area_id,
  state,
  city,
  area,
  status,
  views,
  is_featured,
  created_at,
  listing_images (
    image_url,
    position
  ),
  categories (
    id,
    name,
    slug
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

  if (error) {
    console.error("[listings] getApprovedListings failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  if (!data) {
    return [];
  }

  const listings = (data as ListingRow[]).map(mapListingRow);
  const withImages = await ensureListingImages(supabase, listings);
  return attachSellerCards(supabase, withImages);
}

export async function getAllApprovedListings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listings] getAllApprovedListings failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  if (!data) {
    return [];
  }

  const listings = (data as ListingRow[]).map(mapListingRow);
  const withImages = await ensureListingImages(supabase, listings);
  return attachSellerCards(supabase, withImages);
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

  const listings = (data as ListingRow[]).map(mapListingRow);
  const withImages = await ensureListingImages(supabase, listings);
  return attachSellerCards(supabase, withImages);
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

  const phone = data?.phone ?? null;
  if (!phone || phone.startsWith("pending:")) {
    return null;
  }

  return phone;
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
  const categoryRelation = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  const attributes =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
      ? (row.attributes as Listing["attributes"])
      : {};

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: sanitizeListingTitle(row.title),
    price: Number(row.price),
    category: categoryRelation?.slug ?? row.category,
    categoryId: row.category_id ?? categoryRelation?.id ?? null,
    categoryName: categoryRelation?.name,
    attributes,
    countryId: row.country_id ?? null,
    stateId: row.state_id ?? null,
    cityId: row.city_id ?? null,
    areaId: row.area_id ?? null,
    country: row.country ?? null,
    state: row.state,
    city: row.city,
    area: row.area,
    condition: row.condition,
    description: row.description,
    status: row.status,
    views: row.views,
    verified: row.status === "approved",
    isFeatured: Boolean(row.is_featured),
    createdAt: formatRelativeTime(row.created_at),
    createdAtMs: new Date(row.created_at).getTime(),
    images: imageUrls,
    imageUrl: imageUrls[0] ?? null,
  };
}

async function ensureListingImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listings: Listing[],
) {
  // Nested `listing_images` usually already populated — only hit storage
  // rows for listings that came back without images (avoids N+1 on home/browse).
  if (listings.every((listing) => listing.images.length > 0)) {
    return listings;
  }

  return Promise.all(
    listings.map((listing) => attachListingImages(supabase, listing.id, listing)),
  );
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

type PublicSellerCardRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean;
};

async function attachSellerCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listings: Listing[],
): Promise<Listing[]> {
  const sellerIds = [
    ...new Set(
      listings
        .map((listing) => listing.sellerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (sellerIds.length === 0) {
    return listings;
  }

  const { data, error } = await supabase.rpc("get_public_sellers_by_ids", {
    seller_uuids: sellerIds,
  });

  if (error || !data?.length) {
    if (error) {
      console.error("[listings] attachSellerCards failed", {
        code: error.code,
        message: error.message,
      });
    }
    return listings;
  }

  const sellers = new Map(
    (data as PublicSellerCardRow[]).map((row) => [
      row.id,
      {
        sellerName: formatSellerDisplayName(row),
        sellerAvatarUrl: row.avatar_url,
        sellerVerified: Boolean(row.phone_verified),
      },
    ]),
  );

  return listings.map((listing) => {
    if (!listing.sellerId) {
      return listing;
    }
    const seller = sellers.get(listing.sellerId);
    if (!seller) {
      return listing;
    }
    return {
      ...listing,
      ...seller,
    };
  });
}
