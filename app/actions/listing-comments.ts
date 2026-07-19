"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function postListingComment(
  listingId: string,
  body: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return { ok: false, error: "Sign in to comment." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Comment cannot be empty." };
  }
  if (trimmed.length > 1000) {
    return { ok: false, error: "Comment is too long." };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.status !== "approved") {
    return { ok: false, error: "Listing not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "Complete your profile before commenting.",
    };
  }

  const { error } = await supabase.from("listing_comments").insert({
    listing_id: listingId,
    author_id: user.id,
    body: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function updateListingComment(
  listingId: string,
  commentId: string,
  body: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return { ok: false, error: "Sign in to edit comments." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Comment cannot be empty." };
  }
  if (trimmed.length > 1000) {
    return { ok: false, error: "Comment is too long." };
  }

  const { data: existing } = await supabase
    .from("listing_comments")
    .select("id, author_id, listing_id")
    .eq("id", commentId)
    .maybeSingle();

  if (!existing || existing.listing_id !== listingId) {
    return { ok: false, error: "Comment not found." };
  }

  if (existing.author_id !== user.id) {
    return { ok: false, error: "You can only edit your own comments." };
  }

  const { error } = await supabase
    .from("listing_comments")
    .update({ body: trimmed })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function deleteListingComment(
  listingId: string,
  commentId: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthedClient();

  if (!user) {
    return { ok: false, error: "Sign in to delete comments." };
  }

  const { data: existing } = await supabase
    .from("listing_comments")
    .select("id, author_id, listing_id")
    .eq("id", commentId)
    .maybeSingle();

  if (!existing || existing.listing_id !== listingId) {
    return { ok: false, error: "Comment not found." };
  }

  if (existing.author_id !== user.id) {
    return { ok: false, error: "You can only delete your own comments." };
  }

  const { error } = await supabase
    .from("listing_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}
