export type SellPhotoFormat = "heic" | "heif" | "jpeg" | "png" | "webp" | "gif" | "other";

export function classifyImageFormat(fileName: string, mimeType: string): SellPhotoFormat {
  const type = mimeType.trim().toLowerCase();
  const name = fileName.trim().toLowerCase();

  if (type === "image/heic" || name.endsWith(".heic")) {
    return "heic";
  }

  if (type === "image/heif" || name.endsWith(".heif")) {
    return "heif";
  }

  if (type === "image/jpeg" || type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "jpeg";
  }

  if (type === "image/png" || name.endsWith(".png")) {
    return "png";
  }

  if (type === "image/webp" || name.endsWith(".webp")) {
    return "webp";
  }

  if (type === "image/gif" || name.endsWith(".gif")) {
    return "gif";
  }

  return "other";
}

export function shouldConvertHeicToJpeg(file: File): boolean {
  const format = classifyImageFormat(file.name, file.type);
  return format === "heic" || format === "heif";
}

export function logSellPhotoFile(phase: "selected" | "before-upload" | "converted", file: File) {
  const format = classifyImageFormat(file.name, file.type);

  console.log("[publish] Photo file", {
    phase,
    name: file.name,
    type: file.type || "(empty)",
    format,
    isHeic: format === "heic" || format === "heif",
    isJpeg: format === "jpeg",
    sizeBytes: file.size,
    sizeMb: (file.size / (1024 * 1024)).toFixed(2),
  });
}

export function resolveListingImageContentType(fileName: string, mimeType: string): string {
  const format = classifyImageFormat(fileName, mimeType);

  if (format === "heic" || format === "heif") {
    return "image/jpeg";
  }

  if (mimeType.trim()) {
    return mimeType;
  }

  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}
