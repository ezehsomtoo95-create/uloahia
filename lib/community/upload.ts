"use client";

import { resolveListingImageContentType } from "@/lib/sell/image-format";
import { compressListingPhoto } from "@/lib/sell/compress-listing-photo";
import { createClient } from "@/lib/supabase/client";

/**
 * Compresses a community post photo client-side and uploads it to the public
 * `community-images` bucket. Returns the public URL for the server action.
 */
export async function uploadCommunityPhoto(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in to attach a photo.");
  }

  const compressed = await compressListingPhoto(file);
  const safeName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const contentType = resolveListingImageContentType(compressed.name, compressed.type);

  const { error } = await supabase.storage
    .from("community-images")
    .upload(path, compressed, { contentType, upsert: false });

  if (error) {
    console.error("[community] photo upload failed", error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("community-images").getPublicUrl(path);
  return data.publicUrl;
}