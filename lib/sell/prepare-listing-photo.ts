"use client";

import {
  classifyImageFormat,
  logSellPhotoFile,
  shouldConvertHeicToJpeg,
} from "@/lib/sell/image-format";

/** Longest edge for listing photos — enough for sharp marketplace display. */
const MAX_UPLOAD_EDGE = 2048;
const JPEG_QUALITY = 0.88;
/** Re-encode camera JPEGs above this; PNG/WebP/GIF pass through when smaller. */
const LARGE_FILE_BYTES = 2 * 1024 * 1024;

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
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    return {
      width,
      height,
      maxEdge: Math.max(width, height),
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

async function renderImageFile(
  file: File,
  dimensions: ImageDimensions,
  outputType: "image/jpeg" | "image/png",
  quality?: number,
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
      canvas.toBlob(resolve, outputType, quality);
    });

    if (!blob) {
      throw new Error("Could not prepare this photo for upload.");
    }

    const extension = outputType === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";

    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const dimensions = await readImageDimensions(file);
  const converted = await renderImageFile(file, dimensions, "image/jpeg", JPEG_QUALITY);
  logSellPhotoFile("converted", converted);
  return converted;
}

function shouldReencodeForUpload(file: File, dimensions: ImageDimensions): boolean {
  const format = classifyImageFormat(file.name, file.type);

  if (format === "heic" || format === "heif") {
    return true;
  }

  if (dimensions.maxEdge > MAX_UPLOAD_EDGE) {
    return true;
  }

  if (file.size > LARGE_FILE_BYTES && (format === "jpeg" || format === "other")) {
    return true;
  }

  return false;
}

export async function prepareListingPhoto(file: File): Promise<File> {
  logSellPhotoFile("selected", file);

  if (shouldConvertHeicToJpeg(file)) {
    console.log("[publish] Converting HEIC/HEIF to JPEG", {
      name: file.name,
      type: file.type || "(empty)",
    });
    return convertHeicToJpeg(file);
  }

  const dimensions = await readImageDimensions(file);

  if (!shouldReencodeForUpload(file, dimensions)) {
    console.log("[publish] Photo passed through unchanged", {
      name: file.name,
      type: file.type || "(empty)",
      format: classifyImageFormat(file.name, file.type),
      maxEdge: dimensions.maxEdge,
      sizeBytes: file.size,
    });
    return file;
  }

  const format = classifyImageFormat(file.name, file.type);
  const outputType = format === "png" || format === "gif" ? "image/png" : "image/jpeg";
  const prepared = await renderImageFile(
    file,
    dimensions,
    outputType,
    outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
  );

  logSellPhotoFile("converted", prepared);
  return prepared;
}
