"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveListingImageContentType } from "@/lib/sell/image-format";
import type { SellPhotoItem } from "@/lib/sell/photos";

export type UploadedListingPhoto = {
  url: string;
};

function buildStoragePath(userId: string, listingId: string, position: number, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${userId}/${listingId}/${Date.now()}-${position}-${safeName}`;
}

export async function uploadListingPhotos(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  photos: SellPhotoItem[],
): Promise<{ photos: UploadedListingPhoto[]; uploadedPaths: string[] }> {
  const uploadedPaths: string[] = [];
  const results: UploadedListingPhoto[] = [];

  for (const [position, photo] of photos.entries()) {
    if (photo.source === "existing") {
      results.push({ url: photo.url });
      continue;
    }

    const path = buildStoragePath(userId, listingId, position, photo.file.name);
    const contentType = resolveListingImageContentType(photo.file.name, photo.file.type);

    console.log("[publish] Uploading to storage", {
      position,
      path,
      fileName: photo.file.name,
      fileSize: photo.file.size,
      contentType,
    });

    const { error } = await supabase.storage.from("listing-images").upload(path, photo.file, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("[publish] Client storage upload failed", { position, path, error });
      await deleteUploadedListingPhotos(supabase, uploadedPaths);
      throw new Error(error.message);
    }

    uploadedPaths.push(path);

    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    results.push({ url: data.publicUrl });

    console.log("[publish] Client storage upload finished", {
      position,
      path,
      url: data.publicUrl,
    });
  }

  return { photos: results, uploadedPaths };
}

export async function deleteUploadedListingPhotos(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from("listing-images").remove(paths);
  if (error) {
    console.error("[publish] Failed to clean up uploaded photos", error);
  }
}
