import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CommunityAuthor,
  CommunityPost,
  CommunityPostChannelSlug,
  CommunityReply,
  CommunityTabSlug,
} from "@/lib/types/community";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";
import { getAvatarImageUrl } from "@/lib/utils/storage";

type PostRow = {
  id: string;
  author_id: string;
  channel: CommunityPostChannelSlug;
  body: string;
  location: string | null;
  view_count: number;
  like_count: number;
  reply_count: number;
  created_at: string;
  community_post_images?: Array<{ image_url: string; position: number }> | null;
};

type ReplyRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
};

type AuthorRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  state: string | null;
  city: string | null;
  phone_verified: boolean;
};

async function getAuthorsByIds(ids: string[]): Promise<Map<string, CommunityAuthor>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_community_authors_by_ids", {
    author_uuids: uniqueIds,
  });

  if (error || !data?.length) {
    if (error) {
      console.error("[community] author lookup failed", error.message);
    }
    return new Map();
  }

  return new Map(
    (data as AuthorRow[]).map((row) => [
      row.id,
      {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        state: row.state,
        city: row.city,
        phoneVerified: row.phone_verified,
      },
    ]),
  );
}

async function getLikedPostIds(
  postIds: string[],
  userId: string | null,
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) {
    return new Set();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error || !data) {
    return new Set();
  }

  return new Set((data as Array<{ post_id: string }>).map((row) => row.post_id));
}

function mapPosts(
  rows: PostRow[],
  authors: Map<string, CommunityAuthor>,
  likedPostIds: Set<string>,
  currentUserId: string | null,
): CommunityPost[] {
  return rows.map((row) => {
    const author = authors.get(row.author_id);
    const images = [...(row.community_post_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((image) => image.image_url);

    return {
      id: row.id,
      authorId: row.author_id,
      channel: row.channel,
      body: row.body,
      location: row.location,
      viewCount: row.view_count,
      likeCount: row.like_count,
      replyCount: row.reply_count,
      createdAt: row.created_at,
      createdAtLabel: formatRelativeTime(row.created_at),
      images,
      authorName: formatSellerDisplayName(author, "Member"),
      authorUsername: author?.username ?? null,
      authorAvatarUrl: author ? getAvatarImageUrl(author.avatarUrl, 44) : null,
      likedByMe: Boolean(currentUserId && likedPostIds.has(row.id)),
    };
  });
}

export async function getCommunityFeed(
  tab: CommunityTabSlug,
  userId: string | null,
  limit = 50,
): Promise<CommunityPost[]> {
  const supabase = await createClient();

  let query = supabase
    .from("community_posts")
    .select(
      `
      id,
      author_id,
      channel,
      body,
      location,
      view_count,
      like_count,
      reply_count,
      created_at,
      community_post_images ( image_url, position )
    `,
    )
    .eq("status", "published");

  if (tab === "trending") {
    query = query.order("engagement_score", { ascending: false });
  } else if (tab === "latest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.eq("channel", tab);
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(limit);

  if (error || !data?.length) {
    if (error) {
      console.error("[community] feed failed", error.message);
    }
    return [];
  }

  const rows = data as PostRow[];
  const authors = await getAuthorsByIds(rows.map((row) => row.author_id));
  const likedPostIds = await getLikedPostIds(
    rows.map((row) => row.id),
    userId,
  );

  return mapPosts(rows, authors, likedPostIds, userId);
}

export async function getCommunityPost(
  postId: string,
  userId: string | null,
): Promise<CommunityPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select(
      `
      id,
      author_id,
      channel,
      body,
      location,
      view_count,
      like_count,
      reply_count,
      created_at,
      community_post_images ( image_url, position )
    `,
    )
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as PostRow;
  const authors = await getAuthorsByIds([row.author_id]);
  const likedPostIds = await getLikedPostIds([row.id], userId);

  const [post] = mapPosts([row], authors, likedPostIds, userId);
  return post ?? null;
}

export async function getCommunityReplies(
  postId: string,
  userId: string | null,
): Promise<CommunityReply[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_replies")
    .select("id, post_id, author_id, parent_id, body, created_at")
    .eq("post_id", postId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  const rows = data as ReplyRow[];
  const authors = await getAuthorsByIds(rows.map((row) => row.author_id));

  const nameById = new Map(
    rows.map((row) => [
      row.id,
      formatSellerDisplayName(authors.get(row.author_id), "Member"),
    ]),
  );

  return rows.map((row) => {
    const author = authors.get(row.author_id);
    return {
      id: row.id,
      postId: row.post_id,
      parentId: row.parent_id ?? null,
      authorId: row.author_id,
      authorName: formatSellerDisplayName(author, "Member"),
      authorAvatarUrl: author ? getAvatarImageUrl(author.avatarUrl, 32) : null,
      body: row.body,
      createdAt: formatRelativeTime(row.created_at),
      isMine: Boolean(userId && row.author_id === userId),
      repliedToAuthorName:
        row.parent_id !== null ? nameById.get(row.parent_id) ?? null : null,
    };
  });
}