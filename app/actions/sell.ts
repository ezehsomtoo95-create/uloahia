"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import type { ListingStatus } from "@/lib/types";
import { formatZodError } from "@/lib/validation/common";
import { ListingSchema, type ListingInput, type ListingPhotoInput } from "@/lib/validation/listing";
import { sanitizePlainText } from "@/lib/validation/sanitize";

export type SaveListingResult = {
  listingId: string;
  mode: "created" | "updated";
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  statusCode?: string | number;
};

function logServerListingError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  console.error("SERVER LISTING ERROR DETECTED:", {
    scope,
    error,
    ...extra,
  });
}

function describeListingError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as SupabaseLikeError;
    const parts = [
      record.message,
      record.code ? `code=${record.code}` : null,
      record.details ? `details=${record.details}` : null,
      record.hint ? `hint=${record.hint}` : null,
      record.statusCode ? `status=${record.statusCode}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return String(error);
}

function formatSupabaseFailure(scope: string, error: SupabaseLikeError | null | undefined) {
  const message = describeListingError(error ?? new Error("unknown error"));
  return `${scope}: ${message}`;
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user?.id) {
    throw new Error("Login required.");
  }

  if (!user.email_confirmed_at) {
    throw new Error("Verify your email before publishing listings.");
  }

  return user;
}

/** Approved/rejected edits return to moderation; other statuses are preserved. */
function resolveNextStatus(currentStatus: ListingStatus): ListingStatus {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return "pending";
  }

  return currentStatus;
}

async function assertSellerOwnsListing(listingId: string, sellerId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.seller_id !== sellerId) {
    throw new Error("Listing not found or access denied.");
  }

  return data;
}

async function uploadListingImage(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  listingId: string,
  position: number,
  file: File,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${userId}/${listingId}/${Date.now()}-${position}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("listing-images").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (uploadError) {
    logServerListingError("storage.upload", uploadError, { path, userId, listingId, position });
    throw new Error(formatSupabaseFailure("Photo upload failed", uploadError));
  }

  const { data } = admin.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}

async function syncListingImages(
  listingId: string,
  userId: string,
  photos: ListingPhotoInput[],
  formData: FormData,
) {
  const admin = supabaseAdmin();

  const { error: deleteError } = await admin
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  if (deleteError) {
    logServerListingError("listing_images.delete", deleteError, { listingId });
    throw new Error(formatSupabaseFailure("Could not reset listing photos", deleteError));
  }

  const imageRows: Array<{
    listing_id: string;
    image_url: string;
    position: number;
  }> = [];

  for (const [position, photo] of photos.entries()) {
    try {
      let imageUrl: string;

      if (photo.source === "existing") {
        imageUrl = photo.url;
      } else {
        const fileEntry = formData.get(photo.fieldName);

        if (!(fileEntry instanceof File) || fileEntry.size === 0) {
          throw new Error("One or more photo uploads are missing.");
        }

        imageUrl = await uploadListingImage(admin, userId, listingId, position, fileEntry);
      }

      imageRows.push({
        listing_id: listingId,
        image_url: imageUrl,
        position,
      });
    } catch (error) {
      logServerListingError("listing_images.process", error, { listingId, position, photo });
      throw new Error(describeListingError(error));
    }
  }

  if (imageRows.length === 0) {
    throw new Error("At least one photo is required.");
  }

  const { error: imageError } = await admin.from("listing_images").insert(imageRows);

  if (imageError) {
    logServerListingError("listing_images.insert", imageError, { listingId, imageRows });
    throw new Error(formatSupabaseFailure("Could not save listing photos", imageError));
  }
}

async function updateExistingListing(
  input: ListingInput,
  listingId: string,
  userId: string,
  formData: FormData,
): Promise<SaveListingResult> {
  const admin = supabaseAdmin();
  const existing = await assertSellerOwnsListing(listingId, userId);
  const nextStatus = resolveNextStatus(existing.status as ListingStatus);

  const { data: updatedRow, error } = await admin
    .from("listings")
    .update({
      title: input.title,
      category: input.category,
      condition: input.condition,
      price: input.price,
      description: input.description,
      state: input.state,
      city: input.city,
      area: input.area,
      status: nextStatus,
    })
    .eq("id", listingId)
    .eq("seller_id", userId)
    .select("id")
    .single();

  if (error || !updatedRow) {
    logServerListingError("listings.update", error, { listingId, userId });
    throw new Error(formatSupabaseFailure("Could not update listing", error));
  }

  await syncListingImages(listingId, userId, input.photos, formData);

  return { listingId, mode: "updated" };
}

async function createNewListing(
  input: ListingInput,
  userId: string,
  formData: FormData,
): Promise<SaveListingResult> {
  const admin = supabaseAdmin();
  let listingId: string | null = null;

  try {
    const { data: listing, error } = await admin
      .from("listings")
      .insert({
        seller_id: userId,
        title: input.title,
        category: input.category,
        condition: input.condition,
        price: input.price,
        description: input.description,
        state: input.state,
        city: input.city,
        area: input.area,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !listing) {
      logServerListingError("listings.insert", error, { userId, input });
      throw new Error(formatSupabaseFailure("Could not create listing", error));
    }

    listingId = listing.id;
    await syncListingImages(listing.id, userId, input.photos, formData);

    return { listingId: listing.id, mode: "created" };
  } catch (error) {
    if (listingId) {
      await admin.from("listing_images").delete().eq("listing_id", listingId);
      await admin.from("listings").delete().eq("id", listingId);
    }

    throw error;
  }
}

async function saveListingInternal(
  input: ListingInput,
  formData: FormData,
): Promise<SaveListingResult> {
  let user;

  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login required.";
    throw new Error(message);
  }

  try {
    const listingId = input.listingId;

    if (input.mode === "update" && !listingId) {
      throw new Error("Listing id is required to save edits.");
    }

    if (listingId) {
      return await updateExistingListing(input, listingId, user.id, formData);
    }

    return await createNewListing(input, user.id, formData);
  } catch (error) {
    logServerListingError("saveListingInternal", error);
    if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      throw new Error(
        "Listing publish is temporarily unavailable. Missing SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    throw error;
  }
}

export async function saveListing(formData: FormData): Promise<ActionResult<SaveListingResult>> {
  const photoFields = [...formData.keys()].filter((key) => key.startsWith("photo_"));

  try {
    const rawPayload = formData.get("data");

    if (typeof rawPayload !== "string" || !rawPayload.trim()) {
      return actionError("Invalid listing payload.");
    }

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawPayload);
    } catch (parseError) {
      logServerListingError("saveListing.parse", parseError);
      return actionError("Invalid listing payload.");
    }

    const sanitizedPayload =
      parsedJson && typeof parsedJson === "object"
        ? {
            ...parsedJson,
            title:
              typeof (parsedJson as { title?: unknown }).title === "string"
                ? sanitizePlainText((parsedJson as { title: string }).title)
                : (parsedJson as { title?: unknown }).title,
            description:
              typeof (parsedJson as { description?: unknown }).description === "string"
                ? sanitizePlainText((parsedJson as { description: string }).description)
                : (parsedJson as { description?: unknown }).description,
            state:
              typeof (parsedJson as { state?: unknown }).state === "string"
                ? sanitizePlainText((parsedJson as { state: string }).state)
                : (parsedJson as { state?: unknown }).state,
            city:
              typeof (parsedJson as { city?: unknown }).city === "string"
                ? sanitizePlainText((parsedJson as { city: string }).city)
                : (parsedJson as { city?: unknown }).city,
            area:
              typeof (parsedJson as { area?: unknown }).area === "string"
                ? sanitizePlainText((parsedJson as { area: string }).area)
                : (parsedJson as { area?: unknown }).area,
          }
        : parsedJson;

    const input = ListingSchema.parse(sanitizedPayload);
    console.log("[saveListing] starting", {
      mode: input.mode,
      listingId: input.listingId,
      photoCount: input.photos.length,
      uploadedFileCount: photoFields.length,
    });
    const result = await saveListingInternal(input, formData);

    revalidatePath("/my-listings", "page");
    revalidatePath(`/listing/${result.listingId}`, "page");
    revalidatePath("/browse", "page");
    revalidatePath("/", "layout");

    return actionSuccess(result);
  } catch (error) {
    console.error("SERVER LISTING ERROR DETECTED:", error);

    if (error instanceof SyntaxError) {
      return actionError("Invalid listing payload.");
    }

    // Temporary debug surface: return the raw Supabase/server message to the UI.
    const message = formatZodError(error);
    return actionError(message);
  }
}
