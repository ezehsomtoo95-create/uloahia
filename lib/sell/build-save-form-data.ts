import type { SellPhotoItem } from "@/lib/sell/photos";
import type { ListingAttributes, ListingCondition, ListingStatus } from "@/lib/types";

type BuildSaveListingFormDataInput = {
  listingId?: string;
  originalStatus?: ListingStatus;
  title: string;
  price: string;
  description: string;
  category: string;
  categoryId: string;
  condition: ListingCondition | "";
  country?: string;
  countryId?: string | null;
  state: string;
  stateId?: string | null;
  city: string;
  cityId?: string | null;
  area: string;
  areaId?: string | null;
  attributes?: ListingAttributes;
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
      categoryId: form.categoryId,
      condition: form.condition || "Good",
      country: form.country ?? "Nigeria",
      countryId: form.countryId ?? null,
      state: form.state,
      stateId: form.stateId ?? null,
      city: form.city,
      cityId: form.cityId ?? null,
      area: form.area,
      areaId: form.areaId ?? null,
      attributes: form.attributes ?? {},
      photos,
    }),
  );

  return formData;
}
