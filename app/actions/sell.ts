"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import type { ListingStatus } from "@/lib/types";
import { formatZodError } from "@/lib/validation/common";
import { ListingSchema, type ListingInput } from "@/lib/validation/listing";
import {
  deleteListingImageStoragePaths,
  listingImageUrlsToStoragePaths,
} from "@/lib/utils/listing-storage";

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

async function syncListingImages(listingId: string, photos: ListingInput["photos"]) {
  const admin = supabaseAdmin();

  console.log("[publish] Syncing listing images", {
    listingId,
    photoCount: photos.length,
  });

  const { data: existingRows, error: existingError } = await admin
    .from("listing_images")
    .select("image_url")
    .eq("listing_id", listingId);

  if (existingError) {
    console.error("[publish] Failed to load existing listing images", existingError);
    throw new Error(existingError.message);
  }

  const previousUrls = (existingRows ?? []).map((row) => row.image_url);
  const nextUrls = photos.map((photo) => photo.url);
  const removedUrls = previousUrls.filter((url) => !nextUrls.includes(url));

  if (photos.length === 0) {
    const { error: deleteError } = await admin
      .from("listing_images")
      .delete()
      .eq("listing_id", listingId);

    if (deleteError) {
      console.error("[publish] Failed to clear existing listing images", deleteError);
      throw new Error(deleteError.message);
    }

    await deleteListingImageStoragePaths(admin, removedUrls);
    return;
  }

  const imageRows = photos.map((photo, position) => ({
    listing_id: listingId,
    image_url: photo.url,
    position,
  }));

  const { error: upsertError } = await admin.from("listing_images").upsert(imageRows);

  if (upsertError) {
    console.error("[publish] Database image upsert failed", upsertError);
    throw new Error(upsertError.message);
  }

  const { error: staleDeleteError } = await admin
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId)
    .gte("position", photos.length);

  if (staleDeleteError) {
    console.error("[publish] Failed to remove stale listing images", staleDeleteError);
    throw new Error(staleDeleteError.message);
  }

  await deleteListingImageStoragePaths(admin, removedUrls);

  console.log("[publish] Database image sync finished", {
    listingId,
    rowCount: imageRows.length,
    removedStorageCount: listingImageUrlsToStoragePaths(removedUrls).length,
  });
}

async function updateExistingListing(
  input: ListingInput,
  listingId: string,
  userId: string,
): Promise<SaveListingResult> {
  const admin = supabaseAdmin();
  const existing = await assertSellerOwnsListing(listingId, userId);
  const nextStatus = resolveNextStatus(existing.status as ListingStatus);

  await syncListingImages(listingId, input.photos);

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
    console.error("[publish] Listing update failed", error);
    throw new Error(error?.message ?? "Could not update listing.");
  }

  console.log("[publish] Listing updated", { listingId });

  return { listingId, mode: "updated" };
}

async function createNewListing(input: ListingInput, userId: string): Promise<SaveListingResult> {
  const admin = supabaseAdmin();

  if (!input.listingId) {
    throw new Error("Listing id is required to save a new listing.");
  }

  const { data: listing, error } = await admin
    .from("listings")
    .insert({
      id: input.listingId,
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
    console.error("[publish] Listing insert failed", error);
    throw new Error(error?.message ?? "Could not create listing.");
  }

  console.log("[publish] Listing inserted", { listingId: listing.id });

  try {
    await syncListingImages(listing.id, input.photos);
  } catch (syncError) {
    await admin.from("listings").delete().eq("id", listing.id);
    throw syncError;
  }

  return { listingId: listing.id, mode: "created" };
}

async function saveListingInternal(input: ListingInput): Promise<SaveListingResult> {
  const user = await requireAuthenticatedUser();

  if (input.mode === "update") {
    if (!input.listingId) {
      throw new Error("Listing id is required to save edits.");
    }

    return updateExistingListing(input, input.listingId, user.id);
  }

  return createNewListing(input, user.id);
}

export async function saveListing(input: ListingInput): Promise<ActionResult<SaveListingResult>> {
  console.log("[publish] Server action entered");

  try {
    const parsed = ListingSchema.parse(input);
    const result = await saveListingInternal(parsed);

    revalidatePath("/my-listings", "page");
    revalidatePath(`/listing/${result.listingId}`, "page");
    revalidatePath("/browse", "page");
    revalidatePath("/", "layout");

    console.log("[publish] Server action returned", result);
    return actionSuccess(result);
  } catch (error) {
    console.error("[publish] Server action error", error);
    return actionError(formatZodError(error));
  }
}
