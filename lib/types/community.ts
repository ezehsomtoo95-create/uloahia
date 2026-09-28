export const COMMUNITY_POST_CHANNEL_SLUGS = [
  "business",
  "deals-opportunities",
  "nigeria-gist",
  "cars-transport",
  "tech",
  "property",
  "jobs-career",
  "local-city",
] as const;

export type CommunityPostChannelSlug = (typeof COMMUNITY_POST_CHANNEL_SLUGS)[number];

/** View channels are not persisted — they map to server-side orderings. */
export type CommunityViewSlug = "trending" | "latest";

export type CommunityTabSlug = CommunityViewSlug | CommunityPostChannelSlug;

export type CommunityChannel = {
  slug: CommunityTabSlug;
  label: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  channel: CommunityPostChannelSlug;
  body: string;
  location: string | null;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  createdAtLabel: string;
  images: string[];
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  likedByMe: boolean;
};

export type CommunityReply = {
  id: string;
  postId: string;
  /** The exact reply being responded to (null for top-level replies). */
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  isMine: boolean;
  /** Display name of the person this reply responds to (nested replies only). */
  repliedToAuthorName: string | null;
};

export type CommunityAuthor = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  state: string | null;
  city: string | null;
  phoneVerified: boolean;
};