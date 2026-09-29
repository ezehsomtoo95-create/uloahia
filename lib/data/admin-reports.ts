import type { SupabaseClient } from "@supabase/supabase-js";
import {
  contentReportTypeLabel,
  isListingReportType,
} from "@/lib/safety/constants";
import { formatAdminTime } from "@/lib/utils/admin-time";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";

/**
 * Unified report queue.
 *
 * Every user-submitted report lives in `content_reports`, keyed by a
 * (content_type, content_id) pair. That pair is polymorphic: content_id points
 * at a different table per type, which PostgREST cannot join across in one
 * query, so the reported content is resolved here in batched per-type lookups.
 *
 * The legacy `reports` table (listing-only) is intentionally not read any
 * more. It is retained purely as an audit trail.
 */

export type AdminReportRow = {
  id: string;
  contentType: string;
  contentTypeLabel: string;
  contentId: string;
  /** Title, or a short excerpt for free-text content. */
  contentLabel: string;
  /** Where an admin can inspect the reported content. */
  contentHref: string;
  /** Full body/excerpt, used by the detail modal. */
  contentExcerpt: string;
  reportedUserId: string;
  reportedUserName: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string | null;
  createdAt: string;
  createdAtRaw: string;
};

export type AdminReportDetail = AdminReportRow & {
  /** Present only for listing_report rows. */
  listingId: string | null;
  listingStatus: string | null;
  isListingReport: boolean;
};

type ReportRow = {
  id: string;
  content_type: string;
  content_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export function excerpt(text: string, max = 160) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Per-type metadata for the content that a report points at. */
type Resolved = {
  label: string;
  excerpt: string;
  href: string;
  authorId: string | null;
  listingStatus: string | null;
};

function emptyResolved(): Resolved {
  return {
    label: "Unavailable",
    excerpt: "",
    href: "/admin#admin-reports",
    authorId: null,
    listingStatus: null,
  };
}

type Row = Record<string, unknown>;

/**
 * Batch-resolve every referenced piece of content: one query per content
 * type, keyed by the ids actually present, so the queue costs a fixed number
 * of queries no matter how many reports are open.
 */
async function resolveContent(
  supabase: SupabaseClient,
  reports: ReportRow[],
): Promise<Map<string, Resolved>> {
  const out = new Map<string, Resolved>();
  const idsOf = (type: string) =>
    reports.filter((r) => r.content_type === type).map((r) => r.content_id);
  const empty = { data: [] as Row[], error: null };
  const none = () => Promise.resolve(empty);

  const listingIds = idsOf("listing_report");
  const postIds = idsOf("community_post");
  const replyIds = idsOf("community_reply");
  const commentIds = idsOf("listing_comment");
  const convIds = idsOf("chat_conversation");

  const [listings, posts, replies, comments, convos] = await Promise.all([
    listingIds.length
      ? supabase
          .from("listings")
          .select("id, title, description, seller_id, status")
          .in("id", listingIds)
      : none(),
    postIds.length
      ? supabase
          .from("community_posts")
          .select("id, body, author_id, status")
          .in("id", postIds)
      : none(),
    replyIds.length
      ? supabase
          .from("community_replies")
          .select("id, body, author_id, post_id")
          .in("id", replyIds)
      : none(),
    commentIds.length
      ? supabase
          .from("listing_comments")
          .select("id, body, author_id, listing_id")
          .in("id", commentIds)
      : none(),
    convIds.length
      ? supabase
          .from("conversations")
          .select("id, buyer_id, seller_id, listing_id")
          .in("id", convIds)
      : none(),
  ]);

  const push = (id: string, value: Resolved) => out.set(id, value);

  for (const l of (listings.data ?? []) as Row[]) {
    const title = (l.title as string) || "Untitled listing";
    push(l.id as string, {
      label: title,
      excerpt: excerpt((l.description as string) || title),
      href: `/admin#admin-listings`,
      authorId: (l.seller_id as string) ?? null,
      listingStatus: (l.status as string) ?? null,
    });
  }
  for (const p of (posts.data ?? []) as Row[]) {
    push(p.id as string, {
      label: excerpt(p.body as string, 80),
      excerpt: excerpt(p.body as string),
      href: `/community/${p.id}`,
      authorId: (p.author_id as string) ?? null,
      listingStatus: (p.status as string) ?? null,
    });
  }
  for (const r of (replies.data ?? []) as Row[]) {
    push(r.id as string, {
      label: excerpt(r.body as string, 80),
      excerpt: excerpt(r.body as string),
      href: `/community/${r.post_id}?reply=${r.id}`,
      authorId: (r.author_id as string) ?? null,
      listingStatus: null,
    });
  }
  for (const c of (comments.data ?? []) as Row[]) {
    push(c.id as string, {
      label: excerpt(c.body as string, 80),
      excerpt: excerpt(c.body as string),
      href: `/listing/${c.listing_id}`,
      authorId: (c.author_id as string) ?? null,
      listingStatus: null,
    });
  }
  for (const v of (convos.data ?? []) as Row[]) {
    push(v.id as string, {
      label: "Private conversation",
      excerpt: "",
      href: "/messages",
      authorId: (v.seller_id as string) ?? null,
      listingStatus: null,
    });
  }

  return out;
}

/** Resolve display names for every user referenced by the queue. */
async function resolvePeople(
  supabase: SupabaseClient,
  reports: ReportRow[],
): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const r of reports) {
    if (r.reporter_id) ids.add(r.reporter_id);
    if (r.reported_user_id) ids.add(r.reported_user_id);
  }
  if (ids.size === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in("id", [...ids]);

  const people = (data ?? []) as Array<{
    id: string;
    username: string | null;
    full_name: string | null;
  }>;

  return new Map(
    people.map((p) => [p.id, formatSellerDisplayName(p, "User")]),
  );
}

export async function getAdminReports(
  supabase: SupabaseClient,
  options: { contentType?: string } = {},
): Promise<AdminReportRow[]> {
  let query = supabase
    .from("content_reports")
    .select(
      "id, content_type, content_id, reporter_id, reported_user_id, reason, details, status, created_at",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (options.contentType && options.contentType !== "all") {
    query = query.eq("content_type", options.contentType);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return [];
  }

  const rows = data as ReportRow[];
  const [content, people] = await Promise.all([
    resolveContent(supabase, rows),
    resolvePeople(supabase, rows),
  ]);

  return rows.map((r) => {
    const resolved = content.get(r.content_id) ?? emptyResolved();
    return {
      id: r.id,
      contentType: r.content_type,
      contentTypeLabel: contentReportTypeLabel(r.content_type),
      contentId: r.content_id,
      contentLabel: resolved.label,
      contentHref: resolved.href,
      contentExcerpt: resolved.excerpt,
      reportedUserId: r.reported_user_id,
      reportedUserName: people.get(r.reported_user_id) ?? "Unknown user",
      reporterId: r.reporter_id,
      reporterName: people.get(r.reporter_id) ?? "Unknown user",
      reason: r.reason,
      details: r.details,
      createdAt: formatAdminTime(r.created_at),
      createdAtRaw: r.created_at,
    };
  });
}

export async function getAdminReportDetail(
  supabase: SupabaseClient,
  reportId: string,
): Promise<AdminReportDetail | null> {
  const { data, error } = await supabase
    .from("content_reports")
    .select(
      "id, content_type, content_id, reporter_id, reported_user_id, reason, details, status, created_at",
    )
    .eq("id", reportId)
    .eq("status", "open")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Reuse the list resolver so the detail and the table can never disagree.
  const all = await getAdminReports(supabase, {});
  const row = all.find((r) => r.id === reportId);
  if (!row) {
    return null;
  }

  const isListingReport = isListingReportType(row.contentType);
  return {
    ...row,
    listingId: isListingReport ? row.contentId : null,
    listingStatus: null,
    isListingReport,
  };
}
