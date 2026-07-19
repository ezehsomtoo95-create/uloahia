export const REPORT_LISTING_REASONS = [
  "Scam",
  "Duplicate",
  "Wrong category",
  "Fake item",
  "Prohibited item",
  "Spam",
  "Other",
] as const;

export type ReportListingReason = (typeof REPORT_LISTING_REASONS)[number];

export type NotificationType =
  | "chat_message"
  | "listing_comment"
  | "listing_approved"
  | "listing_rejected"
  | "listing_reported"
  | "listing_expires_soon";

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
  listingId: string;
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
