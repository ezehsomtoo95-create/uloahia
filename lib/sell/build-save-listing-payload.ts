import type { UploadedListingPhoto } from "@/lib/sell/upload-listing-photos";
import type {
  ListingAttributes,
  ListingCondition,
  ListingStatus,
} from "@/lib/types";
import type { ListingInput } from "@/lib/validation/listing";

type BuildSaveListingPayloadInput = {
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
};

export function buildSaveListingPayload(
  form: BuildSaveListingPayloadInput,
  uploadedPhotos: UploadedListingPhoto[],
  options: {
    editListingId?: string | null;
    createListingId?: string;
  },
): ListingInput {
  const existingListingId = form.listingId ?? options.editListingId ?? undefined;
  const isEdit = Boolean(existingListingId);
  const listingId = existingListingId ?? options.createListingId;

  return {
    mode: isEdit ? "update" : "create",
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
    photos: uploadedPhotos.map((photo) => ({
      source: "existing" as const,
      url: photo.url,
    })),
  };
}
