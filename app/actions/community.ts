"use server";

import { revalidatePath } from "next/cache";
import { consumeRateLimit, runContentSafety } from "@/lib/safety/guard";
import { isCommunityPostChannelSlug } from "@/lib/community/channels";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; postId?: string }
  | { ok: false; error: string };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const MAX_BODY_LENGTH = 4000;
const MAX_REPLY_LENGTH = 1000;
const MAX_POST_IMAGES = 3;

export async function createCommunityPost(
  channel: string,
  body: string,
  imageUrls?: (string | null)[] | null,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) {
    return { ok: false, error: "Sign in to post in the Community." };
  }

  if (!isCommunityPostChannelSlug(channel)) {
    return { ok: false, error: "Choose a valid channel for your post." };
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Write something to share." };
  }
  if (trimmedBody.length > MAX_BODY_LENGTH) {
    return { ok: false, error: "Post is too long." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "Complete your profile before posting in the Community.",
    };
  }

  const allowedPost = await consumeRateLimit(
    supabase,
    user.id,
    "community_post",
    8,
    60 * 60,
  );
  if (!allowedPost) {
    return {
      ok: false,
      error: "You have posted several things recently. Take a short break before posting again.",
    };
  }

  const safety = await runContentSafety(
    supabase,
    user.id,
    trimmedBody,
    "community_post",
  );
  if (safety.kind === "block") {
    return { ok: false, error: safety.message };
  }

  const { data: created, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: user.id,
      channel,
      body: trimmedBody,
      status: "published",
    })
    .select("id")
    .maybeSingle();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not create post." };
  }

    const urls = (imageUrls ?? [])
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_POST_IMAGES);

  for (let i = 0; i < urls.length; i++) {
    await supabase.from("community_post_images").insert({
      post_id: created.id,
      image_url: urls[i]!,
      position: i,
    });
  }

  revalidatePath("/community");
  revalidatePath("/");
  return { ok: true, postId: created.id };
}

export async function deleteCommunityPost(postId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) {
    return { ok: false, error: "Sign in to delete posts." };
  }

  const { data: existing } = await supabase
    .from("community_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Post not found." };
  }

  if (existing.author_id !== user.id) {
    return { ok: false, error: "You can only delete your own posts." };
  }

  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/community");
  revalidatePath("/");
  return { ok: true };
}
export async function addCommunityReply(
  postId: string,
  body: string,
  parentReplyId?: string | null,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) {
    return { ok: false, error: "Sign in to reply." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Reply cannot be empty." };
  }
  if (trimmed.length > MAX_REPLY_LENGTH) {
    return { ok: false, error: "Reply is too long." };
  }

  const { data: post } = await supabase
    .from("community_posts")
    .select("id")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    return { ok: false, error: "Post not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "Complete your profile before replying.",
    };
  }
  const allowedReply = await consumeRateLimit(
    supabase,
    user.id,
    "community_reply",
    30,
    60 * 60,
  );
  if (!allowedReply) {
    return {
      ok: false,
      error: "You are replying very quickly. Please slow down a little.",
    };
  }

  const safety = await runContentSafety(
    supabase,
    user.id,
    trimmed,
    "community_reply",
  );
  if (safety.kind === "block") {
    return { ok: false, error: safety.message };
  }

  // Threaded reply: verify the exact reply being responded to belongs to this post.
  const normalizedParentId = parentReplyId?.trim() || null;
  let validatedParentId: string | null = null;

  if (normalizedParentId) {
    const { data: parentReply } = await supabase
      .from("community_replies")
      .select("id, post_id")
      .eq("id", normalizedParentId)
      .eq("post_id", postId)
      .maybeSingle();

    if (!parentReply) {
      return { ok: false, error: "The reply you are responding to was not found." };
    }

    validatedParentId = normalizedParentId;
  }

  const { error } = await supabase.from("community_replies").insert({
    post_id: postId,
    parent_id: validatedParentId,
    author_id: user.id,
    body: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}

export async function toggleCommunityPostLike(postId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) {
    return { ok: false, error: "Sign in to like posts." };
  }

  const { data: existing } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("community_post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}

export async function recordCommunityPostView(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("increment_community_post_view", {
    post_uuid: postId,
  });

  if (error || !data) {
    return { ok: false as const, incremented: false as const };
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return { ok: true as const, incremented: true as const };
}

export async function deleteCommunityReply(
  postId: string,
  replyId: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) {
    return { ok: false, error: "Sign in to delete replies." };
  }

  const { data: existing } = await supabase
    .from("community_replies")
    .select("id, author_id, post_id")
    .eq("id", replyId)
    .maybeSingle();

  if (!existing || existing.post_id !== postId) {
    return { ok: false, error: "Reply not found." };
  }

  if (existing.author_id !== user.id) {
    return { ok: false, error: "You can only delete your own replies." };
  }

  const { error } = await supabase
    .from("community_replies")
    .delete()
    .eq("id", replyId)
    .eq("author_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}

