"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import type { ListingStatus } from "@/lib/types";
import { formatZodError } from "@/lib/validation/common";
import { ListingSchema, type ListingInput, type ListingPhotoInput } from "@/lib/validation/listing";
import { optimizeListingUploadImage } from "@/lib/utils/optimize-upload-image";

export type SaveListingResult = {
  listingId: string;
  mode: "created" | "updated";
};

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Login required.");
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
    throw new Error(deleteError.message);
  }

  const imageRows: Array<{
    listing_id: string;
    image_url: string;
    position: number;
  }> = [];

  for (const [position, photo] of photos.entries()) {
    let imageUrl: string;

    if (photo.source === "existing") {
      imageUrl = photo.url;
    } else {
      const fileEntry = formData.get(photo.fieldName);

      if (!(fileEntry instanceof File) || fileEntry.size === 0) {
        throw new Error("One or more photo uploads are missing.");
      }

      const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const rawBuffer = Buffer.from(await fileEntry.arrayBuffer());
      const optimized = await optimizeListingUploadImage(rawBuffer);
      const stem = safeName.replace(/\.[^.]+$/, "") || "photo";
      const path = `${userId}/${listingId}/${Date.now()}-${position}-${stem}${optimized.extension}`;

      const { error: uploadError } = await admin.storage
        .from("listing-images")
        .upload(path, optimized.buffer, {
          contentType: optimized.contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = admin.storage.from("listing-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    imageRows.push({
      listing_id: listingId,
      image_url: imageUrl,
      position,
    });
  }

  if (imageRows.length === 0) {
    return;
  }

  const { error: imageError } = await admin.from("listing_images").insert(imageRows);

  if (imageError) {
    throw new Error(imageError.message);
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
    throw new Error(error?.message ?? "Could not update listing.");
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
    throw new Error(error?.message ?? "Could not create listing.");
  }

  await syncListingImages(listing.id, userId, input.photos, formData);

  return { listingId: listing.id, mode: "created" };
}

async function saveListingInternal(
  input: ListingInput,
  formData: FormData,
): Promise<SaveListingResult> {
  const user = await requireAuthenticatedUser();
  const listingId = input.listingId;

  if (input.mode === "update" && !listingId) {
    throw new Error("Listing id is required to save edits.");
  }

  if (listingId) {
    return updateExistingListing(input, listingId, user.id, formData);
  }

  return createNewListing(input, user.id, formData);
}

export async function saveListing(formData: FormData): Promise<ActionResult<SaveListingResult>> {
  try {
    const rawPayload = formData.get("data");

    if (typeof rawPayload !== "string" || !rawPayload.trim()) {
      return actionError("Invalid listing payload.");
    }

    const parsedJson = JSON.parse(rawPayload) as unknown;
    const input = ListingSchema.parse(parsedJson);
    const result = await saveListingInternal(input, formData);

    revalidatePath("/my-listings", "page");
    revalidatePath(`/listing/${result.listingId}`, "page");
    revalidatePath("/browse", "page");
    revalidatePath("/", "layout");

    return actionSuccess(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return actionError("Invalid listing payload.");
    }

    return actionError(formatZodError(error));
  }
}
