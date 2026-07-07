import type { UploadedListingPhoto } from "@/lib/sell/upload-listing-photos";
import type {
  EasternState,
  ListingCategorySlug,
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
  category: ListingCategorySlug;
  condition: ListingCondition;
  state: EasternState;
  city: string;
  area: string;
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
    condition: form.condition,
    state: form.state,
    city: form.city,
    area: form.area,
    photos: uploadedPhotos.map((photo) => ({ url: photo.url })),
  };
}
