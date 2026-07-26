import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils/format";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";

export type ListingCommentRow = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

type PublicAuthorRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Public comments fetch. Avoids joining `profiles` under RLS (own-only SELECT),
 * which caused empty threads for anonymous viewers. Author cards come from
 * get_public_sellers_by_ids (security definer).
 */
export async function getListingComments(listingId: string): Promise<ListingCommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_comments")
    .select("id, body, created_at, author_id")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[listing-comments] select failed", {
      code: error.code,
      message: error.message,
      listingId,
    });
    return [];
  }

  if (!data?.length) {
    return [];
  }

  const authorIds = [...new Set(data.map((row) => row.author_id).filter(Boolean))];
  const authors = new Map<string, PublicAuthorRow>();

  if (authorIds.length > 0) {
    const { data: authorRows, error: authorError } = await supabase.rpc(
      "get_public_sellers_by_ids",
      { seller_uuids: authorIds },
    );

    if (authorError) {
      console.error("[listing-comments] author lookup failed", {
        code: authorError.code,
        message: authorError.message,
      });
    } else {
      for (const row of (authorRows as PublicAuthorRow[] | null) ?? []) {
        authors.set(row.id, row);
      }
    }
  }

  return data.map((row) => {
    const author = authors.get(row.author_id);
    const authorName = formatSellerDisplayName(author, "Member");

    return {
      id: row.id,
      body: row.body,
      createdAt: formatRelativeTime(row.created_at),
      authorId: row.author_id,
      authorName,
      authorAvatarUrl: author?.avatar_url ?? null,
    };
  });
}
