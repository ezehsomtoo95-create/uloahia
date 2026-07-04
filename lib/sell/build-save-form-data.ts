import type { SellPhotoItem } from "@/lib/sell/photos";
import type {
  EasternState,
  ListingCategorySlug,
  ListingCondition,
  ListingStatus,
} from "@/lib/types";

export type BuildSaveListingFormDataInput = {
  listingId?: string;
  originalStatus?: ListingStatus;
  title: string;
  price: string;
  description: string;
  category: ListingCategorySlug;
  condition: ListingCondition;
  state: EasternState;
  city: string;
  area: string;
  photos: SellPhotoItem[];
};

export function buildSaveListingFormData(
  form: BuildSaveListingFormDataInput,
  editListingId?: string | null,
): FormData {
  const formData = new FormData();
  const listingId = form.listingId ?? editListingId ?? undefined;
  const photos = form.photos.map((photo, index) => {
    if (photo.source === "existing") {
      return { source: "existing" as const, url: photo.url };
    }

    const fieldName = `photo_${index}`;
    formData.append(fieldName, photo.file);

    return { source: "new" as const, fieldName };
  });

  formData.append(
    "data",
    JSON.stringify({
      mode: listingId ? "update" : "create",
      listingId,
      originalStatus: form.originalStatus,
      title: form.title,
      price: Number(form.price),
      description: form.description,
      category: form.category,
      condition: form.condition,
      state: form.state,
      city: form.city,
      area: form.area,
      photos,
    }),
  );

  return formData;
}
