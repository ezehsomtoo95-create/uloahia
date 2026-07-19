import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import type { PublicSellerProfile } from "@/lib/types/engagement";
import { resolveListingImages } from "@/lib/utils/storage";

type PublicSellerRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  state: string | null;
  city: string | null;
  created_at: string;
  phone_verified: boolean;
  active_listing_count: number;
  total_views: number | string;
};

type ListingImageRow = {
  image_url: string;
  position: number;
};

function mapPublicSeller(row: PublicSellerRow, requireUsername = true): PublicSellerProfile | null {
  if (requireUsername && !row.username) {
    return null;
  }

  const created = new Date(row.created_at);

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    state: row.state,
    city: row.city,
    memberSince: row.created_at,
    memberSinceLabel: created.toLocaleDateString("en-NG", {
      month: "short",
      year: "numeric",
    }),
    phoneVerified: Boolean(row.phone_verified),
    emailVerified: true,
    activeListingCount: Number(row.active_listing_count ?? 0),
    totalViews: Number(row.total_views ?? 0),
  };
}

export async function getPublicSellerByUsername(username: string) {
  const supabase = await createClient();
  let decoded = username.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep raw trim if already decoded / invalid encoding
  }

  const { data, error } = await supabase.rpc("get_public_seller_by_username", {
    shop_username: decoded,
  });

  if (error || !data?.length) {
    return null;
  }

  return mapPublicSeller(data[0] as PublicSellerRow);
}

export async function getPublicSellerById(sellerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_seller_by_id", {
    seller_uuid: sellerId,
  });

  if (error || !data?.length) {
    return null;
  }

  return mapPublicSeller(data[0] as PublicSellerRow, false);
}

export async function getSellerActiveListings(sellerId: string): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
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
      created_at,
      listing_images ( image_url, position ),
      categories ( id, name, slug )
    `,
    )
    .eq("seller_id", sellerId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const seller = await getPublicSellerById(sellerId);
  const sellerName = seller?.fullName?.trim() || seller?.username || "Seller";
  const sellerAvatarUrl = seller?.avatarUrl ?? null;
  const sellerVerified = Boolean(seller?.phoneVerified);

  return data.map((row) => {
    const images = [...((row.listing_images ?? []) as ListingImageRow[])].sort(
      (a, b) => a.position - b.position,
    );
    const imageUrls = resolveListingImages(images.map((image) => image.image_url));
    const categoryRelation = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;

    return {
      id: row.id,
      sellerId: row.seller_id,
      title: row.title,
      price: Number(row.price),
      category: categoryRelation?.slug ?? row.category,
      categoryId: row.category_id ?? categoryRelation?.id ?? null,
      categoryName: categoryRelation?.name,
      attributes:
        row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
          ? (row.attributes as Listing["attributes"])
          : {},
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
      verified: true,
      createdAt: new Date(row.created_at).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      }),
      createdAtMs: new Date(row.created_at).getTime(),
      images: imageUrls,
      imageUrl: imageUrls[0] ?? null,
      sellerName,
      sellerAvatarUrl,
      sellerVerified,
    } satisfies Listing;
  });
}
