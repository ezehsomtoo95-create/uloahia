"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * ID document submission.
 *
 * SECURITY MODEL
 * --------------
 * The document lands in the PRIVATE `verification-docs` bucket (public =
 * false). Three properties matter and are enforced here rather than trusted
 * to the client:
 *
 *   1. The path is always `<user.id>/<random>.<ext>` and is built from the
 *      SERVER-SIDE session, never from anything the client sends. A client
 *      that tries to pass its own path cannot write outside its own folder.
 *   2. Size and MIME type are validated against allowlists before upload.
 *   3. No URL is ever returned to the seller. The private bucket has no
 *      public URL and sellers have no SELECT policy, so the document is
 *      readable only by an admin through a short-lived signed URL.
 *
 * Approval is NOT possible from here: the tier is flipped by the admin
 * review queue (app/admin/actions.ts), never by the submitting client.
 */

type SubmitResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

type WithdrawResult =
  | { ok: true }
  | { ok: false; error: string };

// 5MB: enough for a phone photo of an ID card, small enough that a private
// bucket full of documents is not a liability.
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DOC_TYPES = [
  "government_id",
  "passport",
  "drivers_licence",
  "national_id",
] as const;

export type VerificationDocType = (typeof DOC_TYPES)[number];

/** 0055 adds a unique index on (user_id) WHERE status = 'pending'. */
const PENDING_EXISTS =
  "You already have a verification in review. We'll email you when it's looked at.";

export async function submitVerificationDoc(
  formData: FormData,
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to submit an ID." };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo of your ID." };
  }

  const extension = ALLOWED_MIME[file.type];
  if (!extension) {
    return { ok: false, error: "Use a JPG, PNG, or WebP image." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be under 5MB." };
  }

  const rawDocType = String(formData.get("docType") ?? "government_id");
  const docType = (DOC_TYPES as readonly string[]).includes(rawDocType)
    ? (rawDocType as VerificationDocType)
    : "government_id";

  // Random component so a resubmission never overwrites a document that an
  // admin may still be reading a signed URL for.
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("verification-docs")
    .upload(path, buffer, {
      // Never upsert: each submission is a distinct object.
      upsert: false,
      contentType: file.type,
      // Documents must not be cached by any CDN or browser.
      cacheControl: "0",
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("verification_requests")
    .insert({
      user_id: user.id,
      doc_path: path,
      doc_type: docType,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted) {
    // The unique index on (user_id) WHERE status = 'pending' is what stops
    // duplicate submissions, so surface its message rather than a raw 409.
    const alreadyPending = insertError?.code === "23505";
    if (alreadyPending) {
      return { ok: false, error: PENDING_EXISTS };
    }
    // Do not leave an orphaned object behind if the row was not created.
    await supabase.storage.from("verification-docs").remove([path]);
    return { ok: false, error: insertError?.message ?? "Could not submit." };
  }

  return { ok: true, requestId: inserted.id };
}

/**
 * Withdraw a submission that is still pending.
 *
 * Deleting the request row and the stored object together matters: a pending
 * row whose object is gone would show an admin a broken preview. The object is
 * removed first, and the row is only deleted if that succeeded, so a storage
 * failure leaves a row that still points at a real file rather than the
 * reverse.
 */
export async function withdrawVerificationDoc(
  requestId: string,
): Promise<WithdrawResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in first." };
  }

  // Scoped to the caller's own id, so this cannot be used to probe or cancel
  // someone else's submission.
  const { data: request, error: lookupError } = await supabase
    .from("verification_requests")
    .select("id, doc_path, status")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }
  if (!request) {
    return { ok: false, error: "Verification request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: "This request has already been reviewed." };
  }

  const { error: removeError } = await supabase.storage
    .from("verification-docs")
    .remove([request.doc_path]);

  if (removeError) {
    return { ok: false, error: removeError.message };
  }

  const { error: deleteError } = await supabase
    .from("verification_requests")
    .delete()
    .eq("id", request.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}
