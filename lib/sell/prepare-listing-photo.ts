"use client";

import { compressListingPhoto } from "@/lib/sell/compress-listing-photo";

/** @deprecated Use compressListingPhoto — kept for existing imports. */
export async function prepareListingPhoto(file: File): Promise<File> {
  return compressListingPhoto(file);
}
