import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AppNotification,
  ChatMessage,
  ConversationSummary,
} from "@/lib/types/engagement";
import { resolveListingImages } from "@/lib/utils/storage";
import { formatRelativeTime } from "@/lib/utils/relative-time";

function formatClock(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getUnreadMessageCount(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id, buyer_unread_count, seller_unread_count")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  if (error || !data) {
    return 0;
  }

  return data.reduce((total, row) => {
    if (row.buyer_id === userId) {
      return total + (row.buyer_unread_count ?? 0);
    }
    return total + (row.seller_unread_count ?? 0);
  }, 0);
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getNavBadgeCounts(userId: string | null | undefined) {
  if (!userId) {
    return { messages: 0, notifications: 0 };
  }

  const [messages, notifications] = await Promise.all([
    getUnreadMessageCount(userId),
    getUnreadNotificationCount(userId),
  ]);

  return { messages, notifications };
}

export async function getConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      listing_id,
      buyer_id,
      seller_id,
      last_message_at,
      last_message_preview,
      buyer_unread_count,
      seller_unread_count,
      listing:listings (
        title,
        listing_images ( image_url, position )
      ),
      buyer:profiles!buyer_id ( full_name, username, avatar_url ),
      seller:profiles!seller_id ( full_name, username, avatar_url )
    `,
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .not("last_message_preview", "is", null)
    .neq("last_message_preview", "")
    .order("last_message_at", { ascending: false });

  if (error || !data) {
    console.error("[chat] getConversationsForUser", error?.message);
    return [];
  }

  return data
    .filter((row) => Boolean(row.last_message_preview?.trim()))
    .map((row) => {
    const isBuyer = row.buyer_id === userId;
    const other = isBuyer
      ? (Array.isArray(row.seller) ? row.seller[0] : row.seller)
      : (Array.isArray(row.buyer) ? row.buyer[0] : row.buyer);
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
    const images = [...((listing as { listing_images?: Array<{ image_url: string; position: number }> } | null)?.listing_images ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const imageUrls = resolveListingImages(images.map((image) => image.image_url));

    return {
      id: row.id,
      listingId: row.listing_id,
      listingTitle: (listing as { title?: string } | null)?.title ?? "Listing",
      listingImageUrl: imageUrls[0] ?? null,
      otherPartyName: other?.full_name || other?.username || "Marketplace user",
      otherPartyUsername: other?.username ?? null,
      otherPartyAvatarUrl: other?.avatar_url ?? null,
      lastMessagePreview: row.last_message_preview,
      lastMessageAt: row.last_message_at,
      lastMessageAtLabel: formatRelativeTime(row.last_message_at),
      unreadCount: isBuyer ? row.buyer_unread_count : row.seller_unread_count,
      role: isBuyer ? "buyer" : "seller",
    } satisfies ConversationSummary;
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      listing_id,
      buyer_id,
      seller_id,
      last_message_at,
      last_message_preview,
      buyer_unread_count,
      seller_unread_count,
      buyer_blocked_at,
      seller_blocked_at,
      listing:listings (
        id,
        title,
        status,
        listing_images ( image_url, position )
      ),
      buyer:profiles!buyer_id ( id, full_name, username ),
      seller:profiles!seller_id ( id, full_name, username )
    `,
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.buyer_id !== userId && data.seller_id !== userId) {
    return null;
  }

  const isBuyer = data.buyer_id === userId;
  const other = isBuyer
    ? (Array.isArray(data.seller) ? data.seller[0] : data.seller)
    : (Array.isArray(data.buyer) ? data.buyer[0] : data.buyer);
  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing;
  const images = [...((listing as { listing_images?: Array<{ image_url: string; position: number }> } | null)?.listing_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const imageUrls = resolveListingImages(images.map((image) => image.image_url));

  return {
    id: data.id,
    listingId: data.listing_id,
    listingTitle: (listing as { title?: string } | null)?.title ?? "Listing",
    listingImageUrl: imageUrls[0] ?? null,
    listingStatus: (listing as { status?: string } | null)?.status ?? null,
    otherPartyName: other?.full_name || other?.username || "Marketplace user",
    otherPartyUsername: other?.username ?? null,
    otherPartyId: other?.id ?? null,
    lastMessagePreview: data.last_message_preview,
    lastMessageAt: data.last_message_at,
    lastMessageAtLabel: formatRelativeTime(data.last_message_at),
    unreadCount: isBuyer ? data.buyer_unread_count : data.seller_unread_count,
    role: (isBuyer ? "buyer" : "seller") as "buyer" | "seller",
    isBlocked: Boolean(data.buyer_blocked_at || data.seller_blocked_at),
  };
}

export async function getMessagesForConversation(
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    createdAtLabel: formatClock(row.created_at),
    readAt: row.read_at,
    mine: row.sender_id === userId,
  }));
}

export async function getNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, data, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    data: (row.data ?? {}) as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
    createdAtLabel: formatRelativeTime(row.created_at),
  }));
}
