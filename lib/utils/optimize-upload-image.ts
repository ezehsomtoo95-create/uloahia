import "server-only";

import sharp from "sharp";

const MAX_UPLOAD_WIDTH = 1600;
const UPLOAD_QUALITY = 82;

export type OptimizedUploadImage = {
  buffer: Buffer;
  contentType: "image/jpeg";
  extension: ".jpg";
};

/** Resize (max width 1600px), compress (~82% quality), and normalize to JPEG before storage upload. */
export async function optimizeListingUploadImage(
  input: Buffer,
): Promise<OptimizedUploadImage> {
  const buffer = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_UPLOAD_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: UPLOAD_QUALITY,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    buffer,
    contentType: "image/jpeg",
    extension: ".jpg",
  };
}
