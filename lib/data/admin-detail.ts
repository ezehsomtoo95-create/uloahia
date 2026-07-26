import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryName } from "@/lib/constants/categories";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";
import { resolveListingImageUrl } from "@/lib/utils/storage";
import { formatDisplayPhone } from "@/lib/utils/phone";

export type AdminListingDetail = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  categoryLabel: string;
  condition: string;
  state: string;
  city: string;
  area: string;
  status: string;
  views: number;
  createdAt: string;
  rejectionReason: string | null;
  isFeatured: boolean;
  images: string[];
  seller: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    accountStatus: string;
  };
};

export type AdminUserDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  state: string | null;
  city: string | null;
  joinedAt: string;
  listingsPosted: number;
  listingsSold: number;
  accountStatus: string;
};

export type AdminReportDetail = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  reason: string;
  createdAt: string;
  sellerId: string;
  sellerName: string;
};

function formatAdminTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchUserEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("admin_get_user_email", {
    target_user_id: userId,
  });

  if (error || !data) {
    return null;
  }

  return String(data);
}

type AdminListingDetailRow = {
  id: string;
  title: string;
  description: string;
  price: number | string;
  category: string;
  condition: string;
  state: string;
  city: string;
  area: string;
  status: string;
  views: number;
  created_at: string;
  rejection_reason?: string | null;
  is_featured?: boolean | null;
  seller_id: string;
  listing_images?: { image_url: string; position: number }[] | null;
  seller?:
    | {
        username: string | null;
        full_name: string | null;
        phone: string;
        account_status?: string | null;
      }
    | {
        username: string | null;
        full_name: string | null;
        phone: string;
        account_status?: string | null;
      }[]
    | null;
};

const ADMIN_LISTING_DETAIL_SELECT = `
  id,
  title,
  description,
  price,
  category,
  condition,
  state,
  city,
  area,
  status,
  views,
  created_at,
  rejection_reason,
  is_featured,
  seller_id,
  listing_images (
    image_url,
    position
  ),
  seller:profiles!seller_id (
    username,
    full_name,
    phone,
    account_status
  )
`;

const ADMIN_LISTING_DETAIL_SELECT_BASIC = `
  id,
  title,
  description,
  price,
  category,
  condition,
  state,
  city,
  area,
  status,
  views,
  created_at,
  seller_id,
  listing_images (
    image_url,
    position
  ),
  seller:profiles!seller_id (
    username,
    full_name,
    phone
  )
`;

function mapAdminListingDetailRow(
  data: AdminListingDetailRow,
  email: string | null,
): AdminListingDetail {
  const seller = Array.isArray(data.seller) ? data.seller[0] : data.seller;
  const images = [...(data.listing_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => resolveListingImageUrl(image.image_url))
    .filter(Boolean) as string[];

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    price: Number(data.price),
    category: data.category,
    categoryLabel: getCategoryName(data.category),
    condition: data.condition,
    state: data.state,
    city: data.city,
    area: data.area,
    status: data.status,
    views: Number(data.views ?? 0),
    createdAt: formatAdminTime(data.created_at),
    rejectionReason: data.rejection_reason ?? null,
    isFeatured: Boolean(data.is_featured),
    images,
    seller: {
      id: data.seller_id,
      name: formatSellerDisplayName(seller),
      phone: formatDisplayPhone(seller?.phone),
      email,
      accountStatus: seller?.account_status ?? "active",
    },
  };
}

export async function getAdminListingDetail(
  supabase: SupabaseClient,
  listingId: string,
): Promise<AdminListingDetail | null> {
  if (!listingId?.trim()) {
    console.log("admin listing detail: missing listing id");
    return null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(ADMIN_LISTING_DETAIL_SELECT)
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    console.log("admin listing detail error", { listingId, error });

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("listings")
      .select(ADMIN_LISTING_DETAIL_SELECT_BASIC)
      .eq("id", listingId)
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      console.log("admin listing detail fallback error", { listingId, fallbackError });

      const { data: listingOnly, error: listingOnlyError } = await supabase
        .from("listings")
        .select(
          `
          id,
          title,
          description,
          price,
          category,
          condition,
          state,
          city,
          area,
          status,
          views,
          created_at,
          seller_id,
          listing_images (
            image_url,
            position
          )
        `,
        )
        .eq("id", listingId)
        .maybeSingle();

      if (listingOnlyError || !listingOnly) {
        console.log("admin listing detail listing-only error", {
          listingId,
          listingOnlyError,
        });
        return null;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, phone")
        .eq("id", listingOnly.seller_id)
        .maybeSingle();

      const email = await fetchUserEmail(supabase, listingOnly.seller_id);

      return mapAdminListingDetailRow(
        {
          ...listingOnly,
          seller: profile,
        } as AdminListingDetailRow,
        email,
      );
    }

    const email = await fetchUserEmail(supabase, fallbackData.seller_id);
    return mapAdminListingDetailRow(fallbackData as AdminListingDetailRow, email);
  }

  const email = await fetchUserEmail(supabase, data.seller_id);
  return mapAdminListingDetailRow(data as AdminListingDetailRow, email);
}

export async function getAdminUserDetail(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminUserDetail | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, state, city, created_at, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("status")
    .eq("seller_id", userId);

  const listingsPosted = listings?.length ?? 0;
  const listingsSold =
    listings?.filter((listing) => listing.status === "sold").length ?? 0;
  const email = await fetchUserEmail(supabase, userId);

  return {
    id: profile.id,
    name: profile.full_name?.trim() || "User",
    phone: formatDisplayPhone(profile.phone),
    email,
    state: profile.state,
    city: profile.city,
    joinedAt: formatAdminTime(profile.created_at),
    listingsPosted,
    listingsSold,
    accountStatus: profile.account_status ?? "active",
  };
}

export async function getAdminReportDetail(
  supabase: SupabaseClient,
  reportId: string,
): Promise<AdminReportDetail | null> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      id,
      reason,
      created_at,
      listing_id,
      listing:listings (
        title,
        status,
        seller_id,
        seller:profiles!seller_id (
          username,
          full_name
        )
      )
    `,
    )
    .eq("id", reportId)
    .eq("status", "open")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing;
  const seller = listing?.seller
    ? Array.isArray(listing.seller)
      ? listing.seller[0]
      : listing.seller
    : null;

  return {
    id: data.id,
    listingId: data.listing_id,
    listingTitle: listing?.title ?? "Listing",
    listingStatus: listing?.status ?? "unknown",
    reason: data.reason,
    createdAt: formatAdminTime(data.created_at),
    sellerId: listing?.seller_id ?? "",
    sellerName: formatSellerDisplayName(seller),
  };
}
