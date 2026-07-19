import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/service";
import { formatRelativeTime } from "@/lib/utils/relative-time";

export type AdminKpi = {
  label: string;
  value: string;
  change: string;
  changeTone: "up" | "down" | "neutral";
};

export type AdminChartPoint = {
  label: string;
  value: number;
};

export type AdminActivityItem = {
  id: string;
  icon: string;
  text: string;
  time: string;
  timestamp: number;
};

export type AdminNotification = {
  id: string;
  text: string;
  time: string;
  unread: boolean;
};

export type AdminHealthMetric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
};

export type AdminOverview = {
  kpis: AdminKpi[];
  charts: {
    newUsers: AdminChartPoint[];
    listingsCreated: AdminChartPoint[];
  };
  health: AdminHealthMetric[];
  activities: AdminActivityItem[];
  notifications: AdminNotification[];
  pendingInbox: Array<{
    id: string;
    kind: "signup" | "listing";
    title: string;
    meta: string;
    href: string;
    createdAt: string;
  }>;
  isHealthy: boolean;
  pendingReview: number;
};

/** Local calendar YYYY-MM-DD (avoids UTC shift from toISOString). */
function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayKeyFromTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return localDayKey(date);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysAgo(count: number) {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() - count);
  return date;
}

function last7DayLabels() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = daysAgo(6 - index);
    return {
      key: localDayKey(date),
      label: date.toLocaleDateString("en-NG", { weekday: "short" }),
    };
  });
}

function bucketByDay(
  rows: { created_at: string }[],
  labels: { key: string; label: string }[],
) {
  const counts = new Map(labels.map((item) => [item.key, 0]));

  for (const row of rows) {
    const key = dayKeyFromTimestamp(row.created_at);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return labels.map((item) => ({
    label: item.label,
    value: counts.get(item.key) ?? 0,
  }));
}

function formatChange(current: number, previous: number, suffix: string) {
  const delta = current - previous;

  if (suffix === "%") {
    if (previous === 0) {
      return current > 0
        ? { text: `+100%`, tone: "up" as const }
        : { text: "0%", tone: "neutral" as const };
    }

    const pct = Math.round(((current - previous) / previous) * 100);
    return {
      text: `${pct >= 0 ? "+" : ""}${pct}%`,
      tone: pct >= 0 ? ("up" as const) : ("down" as const),
    };
  }

  return {
    text: `${delta >= 0 ? "+" : ""}${delta} ${suffix}`,
    tone: delta >= 0 ? ("up" as const) : ("down" as const),
  };
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }

  return String(value);
}

function collectErrors(
  labeled: Array<{ label: string; error: { message: string } | null }>,
) {
  return labeled
    .filter((item) => item.error)
    .map((item) => `${item.label}: ${item.error!.message}`);
}

/**
 * Admin overview metrics. Uses the service-role client so RLS cannot zero-out
 * counts for env-email admins. Call only after requireAdmin().
 */
export async function getAdminOverview(
  _sessionClient?: SupabaseClient,
): Promise<AdminOverview> {
  const supabase = supabaseAdmin();
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const sevenDaysAgo = daysAgo(7).toISOString();
  const fourteenDaysAgo = daysAgo(14).toISOString();
  const chartLabels = last7DayLabels();
  const chartWindowStart = daysAgo(6).toISOString();

  const [
    profilesResult,
    recentProfilesResult,
    listingsResult,
    recentListingsResult,
    pendingListingsResult,
    approvedListingsResult,
    soldListingsResult,
    soldPricesResult,
    soldTodayResult,
    reportsResult,
    recentProfilesFeed,
    recentListingsFeed,
    recentApprovedFeed,
    recentSoldFeed,
    recentReportsFeed,
    pendingListingsInbox,
    recentSignupsInbox,
    analyticsUsersResult,
    analyticsListingsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id, created_at").gte("created_at", fourteenDaysAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id, created_at, seller_id").gte("created_at", fourteenDaysAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("listings").select("price").eq("status", "sold"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "sold")
      .gte("reviewed_at", todayStart),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .gte("created_at", chartWindowStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, title, created_at, seller:profiles!seller_id(full_name)")
      .gte("created_at", chartWindowStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, title, reviewed_at, seller:profiles!seller_id(full_name)")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(8),
    supabase
      .from("listings")
      .select("id, title, created_at, seller:profiles!seller_id(full_name)")
      .eq("status", "sold")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("reports")
      .select("id, reason, created_at, listing:listings(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("listings")
      .select("id, title, status, created_at, seller:profiles!seller_id(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "new_user_signup")
      .gte("created_at", chartWindowStart),
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "listing_created")
      .gte("created_at", chartWindowStart),
  ]);

  const queryErrors = collectErrors([
    { label: "profiles.count", error: profilesResult.error },
    { label: "profiles.recent", error: recentProfilesResult.error },
    { label: "listings.count", error: listingsResult.error },
    { label: "listings.recent", error: recentListingsResult.error },
    { label: "listings.pending", error: pendingListingsResult.error },
    { label: "reports.open", error: reportsResult.error },
    { label: "analytics.new_user", error: analyticsUsersResult.error },
    { label: "analytics.listing", error: analyticsListingsResult.error },
  ]);

  if (queryErrors.length > 0) {
    console.error("[admin-overview] query errors", queryErrors);
  }

  const totalUsers = profilesResult.count ?? 0;
  const totalListings = listingsResult.count ?? 0;
  const pendingReview = pendingListingsResult.count ?? 0;
  const approvedListings = approvedListingsResult.count ?? 0;
  const soldListings = soldListingsResult.count ?? 0;
  const reportedListings = reportsResult.error ? 0 : reportsResult.count ?? 0;

  const profilesRecent = recentProfilesResult.data ?? [];
  const listingsRecent = recentListingsResult.data ?? [];

  const usersThisWeek = profilesRecent.filter(
    (row) => row.created_at >= sevenDaysAgo,
  ).length;
  const usersLastWeek = profilesRecent.filter(
    (row) => row.created_at >= fourteenDaysAgo && row.created_at < sevenDaysAgo,
  ).length;

  const listingsThisWeek = listingsRecent.filter(
    (row) => row.created_at >= sevenDaysAgo,
  ).length;
  const listingsLastWeek = listingsRecent.filter(
    (row) => row.created_at >= fourteenDaysAgo && row.created_at < sevenDaysAgo,
  ).length;

  const activeSellerIds = new Set(
    listingsRecent
      .filter((row) => row.created_at >= sevenDaysAgo)
      .map((row) => row.seller_id),
  );
  const activeUsers7d =
    profilesRecent.filter((row) => row.created_at >= sevenDaysAgo).length +
    activeSellerIds.size;

  const usersToday = profilesRecent.filter((row) => row.created_at >= todayStart).length;
  const listingsToday = listingsRecent.filter((row) => row.created_at >= todayStart).length;
  const growthChange = formatChange(usersThisWeek, usersLastWeek, "%");

  const soldRows = soldPricesResult.data ?? [];
  const revenue = soldRows.reduce((sum, row) => sum + Number(row.price ?? 0), 0);

  const { data: viewsSample, error: viewsError } = await supabase
    .from("listings")
    .select("views")
    .eq("status", "approved")
    .limit(500);

  if (viewsError) {
    console.error("[admin-overview] views sample error", viewsError.message);
  }

  const avgViews =
    viewsSample && viewsSample.length > 0
      ? Math.round(
          viewsSample.reduce((sum, row) => sum + Number(row.views ?? 0), 0) /
            viewsSample.length,
        )
      : 0;

  const soldToday = soldTodayResult.count ?? 0;

  const useAnalyticsUsers =
    !analyticsUsersResult.error && Array.isArray(analyticsUsersResult.data);
  const useAnalyticsListings =
    !analyticsListingsResult.error && Array.isArray(analyticsListingsResult.data);

  const newUsersChart = bucketByDay(
    useAnalyticsUsers
      ? analyticsUsersResult.data!
      : profilesRecent.filter((row) => row.created_at >= chartWindowStart),
    chartLabels,
  );
  const listingsChart = bucketByDay(
    useAnalyticsListings
      ? analyticsListingsResult.data!
      : listingsRecent.filter((row) => row.created_at >= chartWindowStart),
    chartLabels,
  );

  const newUsersTotal = newUsersChart.reduce((sum, point) => sum + point.value, 0);
  const listingsCreatedTotal = listingsChart.reduce(
    (sum, point) => sum + point.value,
    0,
  );

  console.log("[admin-overview]", {
    totalUsers,
    totalListings,
    pendingReview,
    chartSource: {
      newUsers: useAnalyticsUsers ? "analytics_events" : "profiles",
      listings: useAnalyticsListings ? "analytics_events" : "listings",
    },
    last7Days: {
      newUsersTotal,
      listingsCreatedTotal,
      newUsersByDay: newUsersChart.map((p) => p.value),
      listingsByDay: listingsChart.map((p) => p.value),
    },
    errors: queryErrors,
  });

  const kpis: AdminKpi[] = [
    {
      label: "Total Users",
      value: formatCompactNumber(totalUsers),
      change: usersToday > 0 ? `+${usersToday} today` : "0 today",
      changeTone: usersToday > 0 ? "up" : "neutral",
    },
    {
      label: "Active Users (7d)",
      value: formatCompactNumber(activeUsers7d),
      change:
        usersThisWeek >= usersLastWeek
          ? `+${usersThisWeek - usersLastWeek} vs last wk`
          : `${usersThisWeek - usersLastWeek} vs last wk`,
      changeTone: usersThisWeek >= usersLastWeek ? "up" : "down",
    },
    {
      label: "Total Listings",
      value: formatCompactNumber(totalListings),
      change: listingsToday > 0 ? `+${listingsToday} today` : "0 today",
      changeTone: listingsToday > 0 ? "up" : "neutral",
    },
    {
      label: "Pending Review",
      value: formatCompactNumber(pendingReview),
      change: pendingReview > 0 ? `${pendingReview} waiting` : "Clear",
      changeTone: pendingReview > 0 ? "down" : "neutral",
    },
    {
      label: "Approved Listings",
      value: formatCompactNumber(approvedListings),
      change: `+${listingsThisWeek} this wk`,
      changeTone: listingsThisWeek >= listingsLastWeek ? "up" : "down",
    },
    {
      label: "Sold Listings",
      value: formatCompactNumber(soldListings),
      change: soldToday > 0 ? `+${soldToday} today` : "0 today",
      changeTone: soldToday > 0 ? "up" : "neutral",
    },
    {
      label: "Revenue",
      value: revenue > 0 ? `₦${formatCompactNumber(revenue)}` : "—",
      change: "Future-ready",
      changeTone: "neutral",
    },
    {
      label: "Growth %",
      value: growthChange.text,
      change: `${usersThisWeek} users this wk`,
      changeTone: growthChange.tone,
    },
  ];

  const health: AdminHealthMetric[] = [
    {
      label: "Pending approvals",
      value: String(pendingReview),
      tone: pendingReview === 0 ? "good" : "warn",
      hint: pendingReview === 0 ? "Queue clear" : "Needs review",
    },
    {
      label: "Listings sold today",
      value: String(soldToday),
      tone: soldToday > 0 ? "good" : "neutral",
      hint: soldToday > 0 ? "Closed deals" : "No closes yet",
    },
    {
      label: "Avg listing views",
      value: String(avgViews),
      tone: avgViews >= 10 ? "good" : "neutral",
      hint: "Approved listings sample",
    },
    {
      label: "Reported listings",
      value: String(reportedListings),
      tone: reportedListings === 0 ? "good" : "bad",
      hint: reportsResult.error ? "Limited access" : reportedListings === 0 ? "No open reports" : "Open cases",
    },
  ];

  type SellerRef =
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;

  function sellerName(seller: SellerRef) {
    if (!seller) {
      return "Seller";
    }

    if (Array.isArray(seller)) {
      return seller[0]?.full_name?.trim() || "Seller";
    }

    return seller.full_name?.trim() || "Seller";
  }

  const activities: AdminActivityItem[] = [
    ...(recentProfilesFeed.data ?? []).slice(0, 4).map((row) => ({
      id: `signup-${row.id}`,
      icon: "👤",
      text: `${row.full_name?.trim() || "New user"} joined`,
      time: formatRelativeTime(row.created_at),
      timestamp: new Date(row.created_at).getTime(),
    })),
    ...(recentListingsFeed.data ?? []).slice(0, 4).map((row) => ({
      id: `listing-${row.id}`,
      icon: "📦",
      text: `${sellerName(row.seller as SellerRef)} posted ${row.title}`,
      time: formatRelativeTime(row.created_at),
      timestamp: new Date(row.created_at).getTime(),
    })),
    ...(recentApprovedFeed.data ?? []).slice(0, 4).map((row) => ({
      id: `approved-${row.id}`,
      icon: "✅",
      text: `${row.title} approved`,
      time: formatRelativeTime(row.reviewed_at ?? row.id),
      timestamp: new Date(row.reviewed_at ?? Date.now()).getTime(),
    })),
    ...(recentSoldFeed.data ?? []).slice(0, 4).map((row) => ({
      id: `sold-${row.id}`,
      icon: "💰",
      text: `${row.title} marked sold`,
      time: formatRelativeTime(row.created_at),
      timestamp: new Date(row.created_at).getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  const notifications: AdminNotification[] = [
    ...(recentProfilesFeed.data ?? []).slice(0, 2).map((row) => ({
      id: `n-signup-${row.id}`,
      text: `New signup: ${row.full_name?.trim() || "User"}`,
      time: formatRelativeTime(row.created_at),
      unread: row.created_at >= sevenDaysAgo,
    })),
    ...(recentListingsFeed.data ?? [])
      .filter((row) => row.created_at >= sevenDaysAgo)
      .slice(0, 2)
      .map((row) => ({
        id: `n-listing-${row.id}`,
        text: `New listing submitted: ${row.title}`,
        time: formatRelativeTime(row.created_at),
        unread: true,
      })),
    ...(recentReportsFeed.data ?? []).slice(0, 2).map((row) => {
      const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
      return {
        id: `n-report-${row.id}`,
        text: `Reported listing: ${listing?.title ?? "Listing"}`,
        time: formatRelativeTime(row.created_at),
        unread: true,
      };
    }),
  ].slice(0, 6);

  const isHealthy = pendingReview === 0 && reportedListings === 0;

  const pendingInbox = [
    ...(pendingListingsInbox.data ?? []).map((row) => ({
      id: `inbox-listing-${row.id}`,
      kind: "listing" as const,
      title: row.title,
      meta: `${sellerName(row.seller as SellerRef)} · pending review`,
      href: `/admin#admin-listings`,
      createdAt: row.created_at,
    })),
    ...(recentSignupsInbox.data ?? []).slice(0, 8).map((row) => ({
      id: `inbox-signup-${row.id}`,
      kind: "signup" as const,
      title: row.full_name?.trim() || "New user",
      meta: "New marketplace signup",
      href: `/admin/users`,
      createdAt: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 16);

  return {
    kpis,
    charts: {
      newUsers: newUsersChart,
      listingsCreated: listingsChart,
    },
    health,
    activities,
    notifications,
    pendingInbox,
    isHealthy,
    pendingReview,
  };
}
