/**
 * RETIRED: the legacy listing-report reason vocabulary.
 *
 * Listing reports now use REPORT_REASONS (lib/safety/constants.ts), the merged
 * list shared with community posts, replies, comments and chats. Migration
 * 0054 widens the content_reports.reason CHECK to match and maps the old
 * values across: Scam / Fake item -> Scam / fraud, Duplicate -> Duplicate
 * listing, the rest pass through unchanged.
 */

/**
 * Seller verification tiers.
 *
 * Replaces the old flat "Verified" badge, which meant only "a phone number is
 * on file" and was applied to essentially every seller. A tier names what was
 * actually checked, so the signal means something.
 *
 * The full enum is defined in migration 0055
 * (public.verification_tier). `shop_verified` and `business_verified` are
 * reserved for Phase 5's paid badges: they exist in the type so we do not have
 * to migrate the enum later, but nothing can set them yet and no UI offers
 * them. Do not render them as achievable.
 */

export const VERIFICATION_TIERS = [
  "none",
  "phone_verified",
  "id_verified",
  "shop_verified",
  "business_verified",
] as const;

export type VerificationTier = (typeof VERIFICATION_TIERS)[number];

/** Tiers a user can actually hold today. */
export const ACHIEVABLE_VERIFICATION_TIERS = [
  "id_verified",
] as const;

export function isVerificationTier(value: unknown): value is VerificationTier {
  return (
    typeof value === "string" &&
    (VERIFICATION_TIERS as readonly string[]).includes(value)
  );
}

/**
 * Normalises anything untrusted (RPC row, JSON) into a tier. Falls back to
 * "none" so a missing/renamed column degrades to "no badge" rather than
 * throwing on a page.
 */
export function toVerificationTier(value: unknown): VerificationTier {
  return isVerificationTier(value) ? value : "none";
}

type TierMeta = {
  label: string;
  /** Short form for dense surfaces (listing cards). */
  shortLabel: string;
  description: string;
};

/**
 * Presentation per tier. `none` is intentionally absent: an unverified seller
 * shows no badge at all rather than a "Not verified" label, which reads as
 * an accusation.
 */
export const VERIFICATION_TIER_META: Record<
  Exclude<VerificationTier, "none" | "phone_verified">,
  TierMeta
> = {
  id_verified: {
    label: "ID verified",
    shortLabel: "ID",
    description:
      "This seller had a government-issued ID reviewed by the AhiaUlo team.",
  },
  shop_verified: {
    label: "Shop verified",
    shortLabel: "Shop",
    description: "This seller's premises were confirmed by the AhiaUlo team.",
  },
  business_verified: {
    label: "Business verified",
    shortLabel: "Business",
    description: "This seller's business registration was confirmed.",
  },
};

/**
 * phone_verified is RETIRED (migration 0056) and deliberately has no entry in
 * VERIFICATION_TIER_META, so no code path can render it even if a stale row
 * somehow reappears in the database. A confirmed phone number shows the
 * seller can receive WhatsApp - it is not an identity check, so it was never
 * a trust signal worth displaying.
 *
 * The value remains in VERIFICATION_TIERS and VERIFICATION_TIER_STRENGTH for
 * the historical record and so existing rows still parse. If it is ever
 * reinstated, it needs a VERIFICATION_TIER_META entry again.
 */
export function isDisplayableVerificationTier(
  tier: VerificationTier,
): tier is Exclude<VerificationTier, "none" | "phone_verified"> {
  return tier !== "none" && tier !== "phone_verified";
}

/** Ordered strongest-first, for "highest tier wins" logic. */
export const VERIFICATION_TIER_STRENGTH: Record<VerificationTier, number> = {
  none: 0,
  phone_verified: 1,
  id_verified: 2,
  shop_verified: 3,
  business_verified: 4,
};

export function verificationTierLabel(tier: VerificationTier): string | null {
  return isDisplayableVerificationTier(tier) ? VERIFICATION_TIER_META[tier].label : null;
}

/** The strongest of several tiers, ignoring the retired phone tier. */
export function highestVerificationTier(
  tiers: readonly VerificationTier[],
): VerificationTier {
  return tiers.reduce<VerificationTier>(
    (best, tier) =>
      VERIFICATION_TIER_STRENGTH[tier] > VERIFICATION_TIER_STRENGTH[best]
        ? tier
        : best,
    "none",
  );
}

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
  /**
   * Strongest tier held. Optional on purpose: this field arrives with
   * migration 0055, so code must tolerate its absence and render no badge
   * rather than throw. See SellerTierBadge.
   */
  verificationTier?: VerificationTier;
  /** @deprecated Kept for call sites that predate tiers; use verificationTier. */
  phoneVerified: boolean;
  emailVerified: boolean;
  activeListingCount: number;
  totalViews: number;
  // Future: ratings, followers
};

export function isPendingProfilePhone(phone: string | null | undefined) {
  if (!phone) {
    return true;
  }

  const trimmed = phone.trim();
  return trimmed === "" || trimmed.startsWith("pending:");
}
