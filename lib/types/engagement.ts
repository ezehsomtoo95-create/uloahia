/**
 * RETIRED: the legacy listing-report reason vocabulary.
 *
 * Listing reports now use REPORT_REASONS (lib/safety/constants.ts), the merged
 * list shared with community posts, replies, comments and chats. Migration
 * 0054 widens the content_reports.reason CHECK to match and maps the old
 * values across: Scam / Fake item -> Scam / fraud, Duplicate -> Duplicate
 * listing, the rest pass through unchanged.
 */

export type NotificationType =
  | "chat_message"
  | "listing_comment"
  | "listing_comment_reply"
  | "security"
  | "listing_approved"
  | "listing_rejected"
  | "listing_reported"
  | "listing_expires_soon"
  | "community_reply"
  | "community_like";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  createdAtLabel: string;
};

export type ConversationSummary = {
  id: string;
  /** Null when this is a listing-less Community direct conversation. */
  listingId: string | null;
  listingTitle: string;
  listingImageUrl: string | null;
  otherPartyName: string;
  otherPartyUsername: string | null;
  otherPartyAvatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  lastMessageAtLabel: string;
  unreadCount: number;
  role: "buyer" | "seller";
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  readAt: string | null;
  mine: boolean;
};

export type PublicSellerProfile = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  state: string | null;
  city: string | null;
  memberSince: string;
  memberSinceLabel: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  activeListingCount: number;
  totalViews: number;
  // Future: ratings, followers, responseTime
};

export function isPendingProfilePhone(phone: string | null | undefined) {
  if (!phone) {
    return true;
  }

  const trimmed = phone.trim();
  return trimmed === "" || trimmed.startsWith("pending:");
}
