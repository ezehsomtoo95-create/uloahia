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

  console.log("[sell] syncListingImages:start", {
    listingId,
    userId,
    photoCount: photos.length,
    newPhotoFields: photos
      .filter((photo) => photo.source === "new")
      .map((photo) => photo.fieldName),
  });

  const { error: deleteError } = await admin
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  if (deleteError) {
    console.error("[sell] syncListingImages:delete_failed", {
      listingId,
      message: deleteError.message,
      code: deleteError.code,
    });
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
      console.log("[sell] syncListingImages:existing_photo", {
        listingId,
        position,
        imageUrl,
      });
    } else {
      const fileEntry = formData.get(photo.fieldName);

      console.log("[sell] syncListingImages:read_form_file", {
        listingId,
        position,
        fieldName: photo.fieldName,
        isFile: fileEntry instanceof File,
        size: fileEntry instanceof File ? fileEntry.size : null,
        type: fileEntry instanceof File ? fileEntry.type : null,
      });

      if (!(fileEntry instanceof File) || fileEntry.size === 0) {
        console.error("[sell] syncListingImages:missing_file", {
          listingId,
          position,
          fieldName: photo.fieldName,
        });
        throw new Error("One or more photo uploads are missing.");
      }

      const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const rawBuffer = Buffer.from(await fileEntry.arrayBuffer());

      let optimized;
      try {
        optimized = await optimizeListingUploadImage(rawBuffer);
      } catch (error) {
        console.error("[sell] syncListingImages:optimize_failed", {
          listingId,
          position,
          fileName: fileEntry.name,
          rawBytes: rawBuffer.length,
          error: error instanceof Error ? error.message : error,
        });
        throw new Error(
          `Could not process "${fileEntry.name}". Try saving it as JPEG or PNG, then publish again.`,
        );
      }

      const stem = safeName.replace(/\.[^.]+$/, "") || "photo";
      const path = `${userId}/${listingId}/${Date.now()}-${position}-${stem}${optimized.extension}`;

      console.log("[sell] syncListingImages:upload_start", {
        listingId,
        position,
        path,
        optimizedBytes: optimized.buffer.length,
      });

      const { error: uploadError } = await admin.storage
        .from("listing-images")
        .upload(path, optimized.buffer, {
          contentType: optimized.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[sell] syncListingImages:upload_failed", {
          listingId,
          position,
          path,
          message: uploadError.message,
          code: uploadError.name,
        });
        throw new Error(uploadError.message);
      }

      const { data } = admin.storage.from("listing-images").getPublicUrl(path);
      imageUrl = data.publicUrl;

      console.log("[sell] syncListingImages:upload_success", {
        listingId,
        position,
        path,
        imageUrl,
      });
    }

    imageRows.push({
      listing_id: listingId,
      image_url: imageUrl,
      position,
    });
  }

  if (imageRows.length === 0) {
    console.warn("[sell] syncListingImages:no_rows", { listingId });
    return;
  }

  const { error: imageError } = await admin.from("listing_images").insert(imageRows);

  if (imageError) {
    console.error("[sell] syncListingImages:insert_failed", {
      listingId,
      rowCount: imageRows.length,
      message: imageError.message,
      code: imageError.code,
    });
    throw new Error(imageError.message);
  }

  console.log("[sell] syncListingImages:complete", {
    listingId,
    savedCount: imageRows.length,
    urls: imageRows.map((row) => row.image_url),
  });
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

  console.log("[sell] createNewListing:created", { listingId: listing.id, userId });

  try {
    await syncListingImages(listing.id, userId, input.photos, formData);
  } catch (error) {
    console.error("[sell] createNewListing:image_sync_failed_rollback", {
      listingId: listing.id,
      error: error instanceof Error ? error.message : error,
    });

    const { error: rollbackError } = await admin
      .from("listings")
      .delete()
      .eq("id", listing.id);

    if (rollbackError) {
      console.error("[sell] createNewListing:rollback_failed", {
        listingId: listing.id,
        message: rollbackError.message,
      });
    }

    throw error;
  }

  return { listingId: listing.id, mode: "created" };
}

async function saveListingInternal(
  input: ListingInput,
  formData: FormData,
): Promise<SaveListingResult> {
  const user = await requireAuthenticatedUser();
  const listingId = input.listingId;

  console.log("[sell] saveListingInternal:start", {
    userId: user.id,
    mode: input.mode ?? (listingId ? "update" : "create"),
    listingId: listingId ?? null,
    photoCount: input.photos.length,
  });

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
      console.error("[sell] saveListing:invalid_payload");
      return actionError("Invalid listing payload.");
    }

    const parsedJson = JSON.parse(rawPayload) as unknown;
    const input = ListingSchema.parse(parsedJson);

    console.log("[sell] saveListing:validated", {
      mode: input.mode ?? (input.listingId ? "update" : "create"),
      listingId: input.listingId ?? null,
      photoCount: input.photos.length,
    });

    const result = await saveListingInternal(input, formData);

    revalidatePath("/my-listings", "page");
    revalidatePath(`/listing/${result.listingId}`, "page");
    revalidatePath("/browse", "page");
    revalidatePath("/", "layout");

    console.log("[sell] saveListing:success", result);

    return actionSuccess(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("[sell] saveListing:json_parse_failed", error.message);
      return actionError("Invalid listing payload.");
    }

    const message = formatZodError(error);
    console.error("[sell] saveListing:failed", {
      message,
      error: error instanceof Error ? error.stack : error,
    });

    return actionError(message);
  }
}
