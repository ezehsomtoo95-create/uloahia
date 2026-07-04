import { compressSellPhotosForUpload } from "@/lib/client/compress-listing-photo";
import {
  buildSaveListingFormData,
  type BuildSaveListingFormDataInput,
} from "@/lib/sell/build-save-form-data";

export async function prepareSaveListingFormData(
  form: BuildSaveListingFormDataInput,
  editListingId?: string | null,
) {
  const compressedPhotos = await compressSellPhotosForUpload(form.photos);

  return buildSaveListingFormData(
    {
      ...form,
      photos: compressedPhotos,
    },
    editListingId,
  );
}
