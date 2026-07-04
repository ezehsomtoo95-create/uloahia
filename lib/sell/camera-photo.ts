"use client";

import {
  classifyImageFormat,
  logSellPhotoFile,
  shouldConvertHeicToJpeg,
} from "@/lib/sell/image-format";

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode this camera photo."));
    image.src = src;
  });
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare this camera photo for upload.");
    }

    context.drawImage(image, 0, 0);

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!jpegBlob) {
      throw new Error("Could not convert this camera photo to JPEG.");
    }

    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
    const converted = new File([jpegBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

    logSellPhotoFile("converted", converted);
    return converted;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function normalizeCameraPhotoForUpload(file: File): Promise<File> {
  logSellPhotoFile("selected", file);

  if (!shouldConvertHeicToJpeg(file)) {
    console.log("[publish] Photo passed through unchanged", {
      name: file.name,
      type: file.type || "(empty)",
      format: classifyImageFormat(file.name, file.type),
    });
    return file;
  }

  console.log("[publish] Converting HEIC/HEIF to JPEG before upload", {
    name: file.name,
    type: file.type || "(empty)",
  });

  return convertHeicToJpeg(file);
}

export { logSellPhotoFile } from "@/lib/sell/image-format";
