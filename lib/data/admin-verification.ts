import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAdminTime } from "@/lib/utils/admin-time";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";

/**
 * Admin ID verification queue.
 *
 * Reads verification_requests joined to the submitter's profile so a reviewer
 * can sanity-check that the name on the document plausibly matches the account
 * before approving. The document itself is never loaded here - it is fetched
 * as a short-lived signed URL at the moment an admin asks for it.
 */

export type AdminVerificationRow = {
  id: string;
  userId: string;
  docPath: string;
  docType: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  sellerName: string;
  sellerUsername: string | null;
  sellerTier: string;
  sellerPhone: string | null;
  sellerListingCount: number;
};

/**
 * Labels for doc types live in lib/types/engagement.ts so the client queue
 * table can render them without importing this server-only module.
 */

export async function getAdminVerificationQueue(
  supabase: SupabaseClient,
  options: { status?: string } = {},
): Promise<AdminVerificationRow[]> {
  const status = options.status ?? "pending";

  let query = supabase
    .from("verification_requests")
    .select(
      `
      id,
      user_id,
      doc_path,
      doc_type,
      status,
      rejection_reason,
      created_at,
      seller:profiles!verification_requests_user_id_fkey (
        id,
        username,
        full_name,
        phone,
        verification_tier
      )
    `,
    )
    .order("created_at", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return [];
  }

  const rows = data as Array<Record<string, unknown>>;
  const userIds = rows.map((r) => r.user_id as string).filter(Boolean);

  // Listing count is not part of the profiles join, so fetch it in one query
  // rather than N.
  const listingsResult = userIds.length
    ? await supabase
        .from("listings")
        .select("seller_id")
        .in("seller_id", userIds)
        .eq("status", "approved")
    : { data: [] as Array<{ seller_id: string }> };

  const counts = new Map<string, number>();
  for (const l of (listingsResult.data ?? []) as Array<{ seller_id: string }>) {
    counts.set(l.seller_id, (counts.get(l.seller_id) ?? 0) + 1);
  }

  return rows.map((row) => {
    const seller = Array.isArray(row.seller)
      ? (row.seller[0] as Record<string, unknown> | undefined)
      : (row.seller as Record<string, unknown> | undefined);

    return {
      id: row.id as string,
      userId: row.user_id as string,
      docPath: row.doc_path as string,
      docType: row.doc_type as string,
      status: row.status as string,
      rejectionReason: (row.rejection_reason as string | null) ?? null,
      submittedAt: formatAdminTime(row.created_at as string),
      sellerName: formatSellerDisplayName(
        {
          username: (seller?.username as string | null) ?? null,
          full_name: (seller?.full_name as string | null) ?? null,
        },
        "Unknown user",
      ),
      sellerUsername: (seller?.username as string | null) ?? null,
      sellerTier: (seller?.verification_tier as string) ?? "none",
      sellerPhone: (seller?.phone as string | null) ?? null,
      sellerListingCount: counts.get(row.user_id as string) ?? 0,
    };
  });
}

/** The signed-in seller's own most recent request, for the profile page. */
export async function getMyVerificationRequest(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("verification_requests")
    .select("id, doc_type, status, rejection_reason, created_at, reviewed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
