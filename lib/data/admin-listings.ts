import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryName } from "@/lib/constants/categories";
import type { AdminReportRow } from "@/lib/data/admin-reports";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";
import { resolveListingImageUrl } from "@/lib/utils/storage";
import { formatDisplayPhone } from "@/lib/utils/phone";

export type AdminListingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "sold"
  | "all";

export type AdminListing = {
  id: string;
  title: string;
  price: number;
  category: string;
  state: string;
  city: string;
  area: string;
  status: string;
  sellerId: string;
  createdAt: string;
  createdAtRaw: string;
  views: number;
  imageUrl: string | null;
  sellerName: string;
  sellerPhone: string;
};

type AdminListingRow = {
  id: string;
  title: string;
  price: number | string;
  category: string;
  state: string;
  city: string;
  area: string;
  status: string;
  seller_id: string;
  created_at: string;
  views: number;
  listing_images?: { image_url: string; position: number }[] | null;
  seller?:
    | { username: string | null; full_name: string | null; phone: string }
    | { username: string | null; full_name: string | null; phone: string }[]
    | null;
};

const ADMIN_LISTING_SELECT = `
  id,
  title,
  price,
  category,
  status,
  state,
  city,
  area,
  seller_id,
  created_at,
  views,
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

const ADMIN_LISTING_SELECT_BASIC = `
  id,
  title,
  price,
  category,
  status,
  state,
  city,
  area,
  seller_id,
  created_at,
  listing_images (
    image_url,
    position
  )
`;
function getSellerProfile(row: AdminListingRow) {
  if (!row.seller) {
    return null;
  }

  if (Array.isArray(row.seller)) {
    return row.seller[0] ?? null;
  }

  return row.seller;
}

function mapAdminListing(row: AdminListingRow): AdminListing {
  const images = [...(row.listing_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const seller = getSellerProfile(row);

  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    category: row.category,
    state: row.state,    city: row.city,
    area: row.area,
    status: row.status,
    sellerId: row.seller_id,
    createdAt: formatAdminTime(row.created_at),
    createdAtRaw: row.created_at,
    views: Number(row.views ?? 0),
    imageUrl: resolveListingImageUrl(images[0]?.image_url ?? null),
    sellerName: formatSellerDisplayName(seller),
    sellerPhone: formatDisplayPhone(seller?.phone),
  };
}

function formatAdminTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchesSearch(listing: AdminListing, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return (
    listing.title.toLowerCase().includes(needle) ||
    listing.sellerName.toLowerCase().includes(needle) ||
    listing.sellerPhone.toLowerCase().includes(needle) ||
    getCategoryName(listing.category).toLowerCase().includes(needle)
  );}

export async function getAdminListings(
  supabase: SupabaseClient,
): Promise<AdminListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(ADMIN_LISTING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("admin listings error", error);

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("listings")
      .select(ADMIN_LISTING_SELECT_BASIC)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.log("admin listings fallback error", fallbackError);
      return [];
    }

    console.log("admin listings", fallbackData);
    return (fallbackData ?? []).map((row) => mapAdminListing(row as AdminListingRow));
  }

  console.log("admin listings", data);
  return (data ?? []).map((row) => mapAdminListing(row as AdminListingRow));
}

export type AdminTableSort = "newest" | "oldest" | "most_viewed";

export type AdminUserRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  state: string | null;
  city: string | null;
  createdAt: string;
  createdAtRaw: string;
  listingCount: number;
  soldCount: number;
  accountStatus: string;
};

/** Re-exported from the unified report queue; defined in lib/data/admin-reports. */
export type { AdminReportRow } from "@/lib/data/admin-reports";

function sortListings(listings: AdminListing[], sort: AdminTableSort) {
  const next = [...listings];

  if (sort === "oldest") {
    return next.sort(
      (a, b) =>
        new Date(a.createdAtRaw).getTime() - new Date(b.createdAtRaw).getTime(),
    );
  }

  if (sort === "most_viewed") {
    return next.sort((a, b) => b.views - a.views);
  }

  return next.sort(
    (a, b) =>
      new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime(),
  );
}

export async function getAdminUsers(
  supabase: SupabaseClient,
): Promise<AdminUserRow[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, state, city, created_at, account_status")
    .order("created_at", { ascending: false });

  if (error || !profiles) {
    return [];
  }

  const { data: listings } = await supabase.from("listings").select("seller_id, status");

  const countBySeller = new Map<string, number>();
  const soldBySeller = new Map<string, number>();

  for (const row of listings ?? []) {
    countBySeller.set(row.seller_id, (countBySeller.get(row.seller_id) ?? 0) + 1);

    if (row.status === "sold") {
      soldBySeller.set(row.seller_id, (soldBySeller.get(row.seller_id) ?? 0) + 1);
    }
  }

  const users = await Promise.all(
    profiles.map(async (profile) => {
      const { data: email } = await supabase.rpc("admin_get_user_email", {
        target_user_id: profile.id,
      });

      return {
        id: profile.id,
        name: profile.full_name?.trim() || "User",
        phone: formatDisplayPhone(profile.phone),
        email: email ? String(email) : null,
        state: profile.state,
        city: profile.city,
        createdAt: formatAdminTime(profile.created_at),
        createdAtRaw: profile.created_at,
        listingCount: countBySeller.get(profile.id) ?? 0,
        soldCount: soldBySeller.get(profile.id) ?? 0,
        accountStatus: profile.account_status ?? "active",
      };
    }),
  );

  return users;
}

export async function getAdminReports(
  supabase: SupabaseClient,
  options: { contentType?: string } = {},
) {
  // Implementation lives in lib/data/admin-reports; re-exported here so
  // existing import paths keep working.
  const { getAdminReports: load } = await import("@/lib/data/admin-reports");
  return load(supabase, options);
}

export async function getAdminTableData(
  supabase: SupabaseClient,
  options: {
    tab?: "listings" | "users" | "reports";
    q?: string;
    sort?: AdminTableSort;
    /** Narrow the reports tab to one content type ("all" = no filter). */
    contentType?: string;
  } = {},
) {
  const tab = options.tab ?? "listings";
  const sort = options.sort ?? "newest";
  const query = options.q ?? "";

  if (tab === "users") {
    const users = await getAdminUsers(supabase);
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? users.filter(
          (user) =>
            user.name.toLowerCase().includes(needle) ||
            user.phone.toLowerCase().includes(needle),
        )
      : users;

    return {
      tab,
      listings: [] as AdminListing[],
      users: filtered,
      reports: [] as AdminReportRow[],
    };
  }

  if (tab === "reports") {
    const reports = await getAdminReports(supabase, {
      contentType: options.contentType,
    });
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? reports.filter(
          (report) =>
            report.contentLabel.toLowerCase().includes(needle) ||
            report.reason.toLowerCase().includes(needle) ||
            report.contentTypeLabel.toLowerCase().includes(needle) ||
            report.reportedUserName.toLowerCase().includes(needle) ||
            report.reporterName.toLowerCase().includes(needle) ||
            (report.details ?? "").toLowerCase().includes(needle),
        )
      : reports;

    return {
      tab,
      listings: [] as AdminListing[],
      users: [] as AdminUserRow[],
      reports: filtered,
    };
  }

  const allListings = await getAdminListings(supabase);
  const searched = query
    ? allListings.filter((listing) => matchesSearch(listing, query))
    : allListings;

  return {
    tab,
    listings: sortListings(searched, sort),
    users: [] as AdminUserRow[],
    reports: [] as AdminReportRow[],
  };
}

export async function getAdminDashboardData(
  supabase: SupabaseClient,
  options: { status?: string; q?: string } = {},
) {
  const filter = (options.status ?? "all") as AdminListingStatus;
  const query = options.q ?? "";

  const allListings = await getAdminListings(supabase);
  const searched = query
    ? allListings.filter((listing) => matchesSearch(listing, query))
    : allListings;

  const pending = searched.filter((listing) => listing.status === "pending");
  const approved = searched.filter((listing) => listing.status === "approved");
  const sold = searched.filter((listing) => listing.status === "sold");
  const rejected = searched.filter((listing) => listing.status === "rejected");

  const filtered =
    filter === "all"
      ? searched
      : searched.filter((listing) => listing.status === filter);

  return {
    stats: {
      pending: allListings.filter((listing) => listing.status === "pending").length,
      approved: allListings.filter((listing) => listing.status === "approved").length,
      sold: allListings.filter((listing) => listing.status === "sold").length,
      total: allListings.length,
    },
    pending,
    approved: approved.slice(0, 10),
    sold: sold.slice(0, 10),
    rejected,
    filtered,
    filter,
    query,
  };
}
