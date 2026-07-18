"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import {
  REPORT_LISTING_REASONS,
  type ReportListingReason,
} from "@/lib/types/engagement";
import { isPendingProfilePhone } from "@/lib/types/engagement";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import { validateUsername } from "@/lib/utils/username";

type ActionResult =
  | { ok: true; conversationId?: string }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

export async function startListingConversation(listingId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in to chat with the seller." };
  }

  const trimmedListingId = listingId.trim();
  if (!trimmedListingId) {
    return { ok: false, error: "Listing not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  if (isPendingProfilePhone(profile?.phone)) {
    return { ok: false, error: "Add your phone number before messaging sellers." };
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_id, status, title")
    .eq("id", trimmedListingId)
    .maybeSingle();

  if (listingError || !listing) {
    return { ok: false, error: "Listing not found." };
  }

  if (listing.status !== "approved") {
    return { ok: false, error: "This listing is not available for chat." };
  }

  if (listing.seller_id === user.id) {
    return { ok: false, error: "You cannot message your own listing." };
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, conversationId: existing.id };
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    })
    .select("id")
    .maybeSingle();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not start conversation." };
  }

  revalidatePath("/messages");
  return { ok: true, conversationId: created.id };
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in to send messages." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Message cannot be empty." };
  }
  if (trimmed.length > 2000) {
    return { ok: false, error: "Message is too long." };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, buyer_blocked_at, seller_blocked_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    return { ok: false, error: "Conversation not found." };
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return { ok: false, error: "Not allowed." };
  }

  if (conversation.buyer_blocked_at || conversation.seller_blocked_at) {
    return { ok: false, error: "This conversation is unavailable." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true, conversationId };
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const { error } = await supabase.rpc("mark_conversation_read", {
    conversation_uuid: conversationId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/notifications");
  return { ok: true, conversationId };
}

export async function reportListing(
  listingId: string,
  reason: ReportListingReason,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in to report a listing." };
  }

  if (!REPORT_LISTING_REASONS.includes(reason)) {
    return { ok: false, error: "Choose a valid report reason." };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.status !== "approved") {
    return { ok: false, error: "Listing not found." };
  }

  if (listing.seller_id === user.id) {
    return { ok: false, error: "You cannot report your own listing." };
  }

  const { error } = await supabase.from("reports").insert({
    listing_id: listingId,
    reporter_id: user.id,
    reason,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/notifications");
  return { ok: true };
}

export async function completeProfile(input: {
  phone: string;
  fullName?: string;
  username?: string;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const normalizedPhone = normalizeNigerianPhone(input.phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid Nigerian phone number." };
  }

  const fullName = input.fullName?.trim() || null;
  const usernameRaw = input.username?.trim() || null;
  let username: string | null = null;

  if (usernameRaw) {
    const validated = validateUsername(usernameRaw);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    username = validated.username;
  }

  const { data: phoneOwner } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .neq("id", user.id)
    .maybeSingle();

  if (phoneOwner) {
    return { ok: false, error: "That phone number is already in use." };
  }

  if (username) {
    const { data: usernameOwner } = await supabaseAdmin()
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", user.id)
      .maybeSingle();

    if (usernameOwner) {
      return { ok: false, error: "That name is taken." };
    }
  }

  const payload: Record<string, string | null> = {
    phone: normalizedPhone,
    phone_verified_at: null,
  };

  if (fullName) {
    payload.full_name = fullName;
  }
  if (username) {
    payload.username = username;
  }

  const avatar =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null;
  if (avatar) {
    payload.avatar_url = avatar;
  }

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.auth.updateUser({
    data: {
      phone: normalizedPhone,
      full_name: fullName,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/profile/complete");
  return { ok: true };
}

export async function notifyListingStatusChange(
  listingId: string,
  status: "approved" | "rejected",
  rejectionReason?: string | null,
) {
  const admin = supabaseAdmin();
  const { data: listing } = await admin
    .from("listings")
    .select("id, title, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing?.seller_id) {
    return;
  }

  if (status === "approved") {
    await admin.rpc("create_notification", {
      target_user_id: listing.seller_id,
      notification_type: "listing_approved",
      notification_title: "Listing approved",
      notification_body: `"${listing.title}" is now live on AhiaUlo.`,
      notification_link: `/listing/${listing.id}`,
      notification_data: { listing_id: listing.id },
    });
    return;
  }

  await admin.rpc("create_notification", {
    target_user_id: listing.seller_id,
    notification_type: "listing_rejected",
    notification_title: "Listing needs changes",
    notification_body:
      rejectionReason?.trim() ||
      `"${listing.title}" was not approved. Edit and resubmit from My listings.`,
    notification_link: "/my-listings",
    notification_data: {
      listing_id: listing.id,
      reason: rejectionReason ?? null,
    },
  });
}
