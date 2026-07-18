import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils/format";

export type ListingCommentRow = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export async function getListingComments(listingId: string): Promise<ListingCommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_comments")
    .select(
      `
      id,
      body,
      created_at,
      profiles (
        full_name,
        username,
        avatar_url
      )
    `,
    )
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const authorName =
      (profile as { full_name?: string | null; username?: string | null } | null)?.full_name ||
      (profile as { username?: string | null } | null)?.username ||
      "Member";

    return {
      id: row.id,
      body: row.body,
      createdAt: formatRelativeTime(row.created_at),
      authorName,
      authorAvatarUrl:
        (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    };
  });
}
