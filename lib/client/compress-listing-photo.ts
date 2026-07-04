const MAX_UPLOAD_WIDTH = 1600;
const UPLOAD_QUALITY = 0.82;

/** Compress in the browser before server action upload to avoid body-size limits and slow mobile uploads. */
export async function compressListingPhotoForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size === 0) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", UPLOAD_QUALITY);
    });

    if (!blob) {
      return file;
    }

    const stem = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${stem}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("[sell] client photo compress failed, using original file", {
      name: file.name,
      size: file.size,
      error,
    });
    return file;
  }
}

export async function compressSellPhotosForUpload(
  photos: Array<
    | { source: "existing"; url: string; id: string }
    | { source: "new"; file: File; id: string }
  >,
) {
  return Promise.all(
    photos.map(async (photo) => {
      if (photo.source === "existing") {
        return photo;
      }

      return {
        ...photo,
        file: await compressListingPhotoForUpload(photo.file),
      };
    }),
  );
}
