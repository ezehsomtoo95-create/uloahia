"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { assertIsAdmin } from "@/lib/admin/auth";
import { adminError, adminSuccess, type AdminActionResult } from "@/lib/admin/results";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

/**
 * Admin-side ID verification review.
 *
 * The document lives in a PRIVATE bucket, so there is no URL to embed. Each
 * preview is a signed URL minted on demand with the service role and given a
 * short TTL, so a link that leaks into a screenshot or a browser history stops
 * working almost immediately. Never build a public URL for these - the bucket
 * is deliberately not public.
 *
 * Approval is the ONLY path that grants a verification tier. There is no
 * client-facing action that can set one.
 */

// Five minutes is enough to open a document and compare it against the
// seller's profile, and short enough that a leaked link is close to useless.
const SIGNED_URL_TTL_SECONDS = 300;

async function assertAdmin() {
  const userSupabase = await createClient();
  if (!(await assertIsAdmin(userSupabase))) {
    throw new Error("Not authorized for admin mutations.");
  }
}

function revalidateVerificationSurfaces(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/verification");
  revalidatePath("/profile");
  revalidatePath(`/store/${userId}`);
  revalidatePath("/");
  revalidatePath("/browse");
}

/** Short-lived signed URL for a pending document, or null if unavailable. */
export async function createVerificationPreviewUrl(
  requestId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();

  const admin = supabaseAdmin();
  const { data: request, error } = await admin
    .from("verification_requests")
    .select("id, doc_path, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!request) {
    return { ok: false, error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: "This request has already been reviewed." };
  }

  const { data, error: signError } = await admin.storage
    .from("verification-docs")
    .createSignedUrl(request.doc_path, SIGNED_URL_TTL_SECONDS, {
      // Force a download rather than letting the browser render it inline,
      // so the document is not casually displayed on a shared screen.
      download: true,
    });

  if (signError || !data?.signedUrl) {
    return { ok: false, error: signError?.message ?? "Could not sign URL." };
  }

  return { ok: true, url: data.signedUrl };
}

/**
 * Approve a document and grant id_verified.
 *
 * The tier is never computed here from a phone number: phone_verified is
 * retired (migration 0056) and ID is the entry point, so approving sets
 * id_verified outright. An already-id_verified seller is left alone so the
 * action is idempotent.
 */
export async function approveVerificationRequest(
  requestId: string,
): Promise<AdminActionResult> {
  const { user } = await requireAdmin();

  try {
    await assertAdmin();
  } catch {
    return adminError("Not authorized to review verification.");
  }

  const admin = supabaseAdmin();

  const { data: request, error: lookupError } = await admin
    .from("verification_requests")
    .select("id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (lookupError) {
    return adminError(lookupError.message);
  }
  if (!request) {
    return adminError("Request not found.");
  }
  if (request.status !== "pending") {
    return adminError("This request has already been reviewed.");
  }

  const { error: tierError } = await admin
    .from("profiles")
    .update({ verification_tier: "id_verified" })
    .eq("id", request.user_id)
    .neq("verification_tier", "id_verified");

  if (tierError) {
    return adminError(tierError.message);
  }

  const { error: updateError } = await admin
    .from("verification_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) {
    return adminError(updateError.message);
  }

  // Audit row, matching the pattern used for other moderation actions.
  // content_type is left NULL on purpose: the column constrains to reportable
  // CONTENT types (community_post / reply / listing_comment / chat_message) and
  // an ID document is none of those. The request id in `detail` is the link.
  await admin.from("moderation_events").insert({
    user_id: request.user_id,
    actor_id: user.id,
    source: "admin",
    content_type: null,
    action: "cleared",
    risk_level: "low",
    reason_code: "id_verification_approved",
    detail: { request_id: requestId, granted: "id_verified" },
  });

  revalidateVerificationSurfaces(request.user_id);
  return adminSuccess();
}

/**
 * Reject a document. The tier is left exactly as it was: a rejected ID must
 * not downgrade someone who already holds a higher tier.
 */
export async function rejectVerificationRequest(
  requestId: string,
  reason: string,
): Promise<AdminActionResult> {
  const { user } = await requireAdmin();

  try {
    await assertAdmin();
  } catch {
    return adminError("Not authorized to review verification.");
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return adminError("Give a reason so the seller knows why.");
  }

  const admin = supabaseAdmin();

  const { data: request, error: lookupError } = await admin
    .from("verification_requests")
    .select("id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (lookupError) {
    return adminError(lookupError.message);
  }
  if (!request) {
    return adminError("Request not found.");
  }
  if (request.status !== "pending") {
    return adminError("This request has already been reviewed.");
  }

  const { error: updateError } = await admin
    .from("verification_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed.slice(0, 500),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) {
    return adminError(updateError.message);
  }

  await admin.from("moderation_events").insert({
    user_id: request.user_id,
    actor_id: user.id,
    source: "admin",
    content_type: null,
    action: "flagged_review",
    risk_level: "review",
    reason_code: "id_verification_rejected",
    detail: { request_id: requestId, reason: trimmed.slice(0, 500) },
  });

  revalidateVerificationSurfaces(request.user_id);
  return adminSuccess();
}
