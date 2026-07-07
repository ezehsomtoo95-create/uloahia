"use client";

import {
  classifyImageFormat,
  shouldConvertHeicToJpeg,
} from "@/lib/sell/image-format";
import type { SellPhotoItem } from "@/lib/sell/photos";

/** Keeps listing uploads under serverless payload limits while staying sharp on mobile. */
const MAX_UPLOAD_EDGE = 1200;
const TARGET_MAX_BYTES = 500 * 1024;
const JPEG_QUALITIES = [0.75, 0.65, 0.55] as const;

type ImageDimensions = {
  width: number;
  height: number;
  maxEdge: number;
};

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode this photo."));
    image.src = src;
  });
}

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      maxEdge: Math.max(image.naturalWidth, image.naturalHeight),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (Math.max(width, height) <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / Math.max(width, height);

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function renderJpegFile(
  file: File,
  dimensions: ImageDimensions,
  quality: number,
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const target = scaledDimensions(dimensions.width, dimensions.height, MAX_UPLOAD_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare this photo for upload.");
    }

    context.drawImage(image, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error("Could not prepare this photo for upload.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function shouldCompress(file: File, dimensions: ImageDimensions): boolean {
  if (shouldConvertHeicToJpeg(file)) {
    return true;
  }

  if (dimensions.maxEdge > MAX_UPLOAD_EDGE) {
    return true;
  }

  if (file.size > 350 * 1024) {
    return true;
  }

  const format = classifyImageFormat(file.name, file.type);
  return format === "png" || format === "gif" || format === "webp";
}

/**
 * Compresses a listing photo client-side before upload (canvas JPEG, max 1200px edge).
 */
export async function compressListingPhoto(file: File): Promise<File> {
  const dimensions = await readImageDimensions(file);

  if (!shouldCompress(file, dimensions)) {
    return file;
  }

  let compressed = file;

  for (const quality of JPEG_QUALITIES) {
    compressed = await renderJpegFile(file, dimensions, quality);
    if (compressed.size <= TARGET_MAX_BYTES) {
      return compressed;
    }
  }

  return compressed;
}

export async function compressSellPhotoItems(photos: SellPhotoItem[]): Promise<SellPhotoItem[]> {
  return Promise.all(
    photos.map(async (photo) => {
      if (photo.source === "existing") {
        return photo;
      }

      return {
        ...photo,
        file: await compressListingPhoto(photo.file),
      };
    }),
  );
}
