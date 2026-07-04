"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  Save,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/constants/brand";
import { CATEGORIES, normalizeCategorySlug } from "@/lib/constants/categories";
import { EASTERN_NIGERIA_LOCATIONS, getAreasForCity, getCitiesForState } from "@/lib/constants/locations";
import { LISTING_CONDITIONS, SELL_FLOW_STEPS } from "@/lib/constants/listings";
import { saveListing as saveListingAction } from "@/app/actions/sell";
import { SellPhotoGrid } from "@/components/sell/sell-photo-grid";
import { PreviewImage } from "@/components/ui/preview-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { MAX_SELL_PHOTOS, createSellPhotoId, type SellPhotoItem } from "@/lib/sell/photos";
import { buildSaveListingPayload } from "@/lib/sell/build-save-listing-payload";
import { prepareListingPhoto } from "@/lib/sell/prepare-listing-photo";
import { logSellPhotoFile } from "@/lib/sell/image-format";
import {
  deleteUploadedListingPhotos,
  uploadListingPhotos,
} from "@/lib/sell/upload-listing-photos";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils/format";
import type { EasternState, ListingCondition, ListingCategorySlug, ListingStatus } from "@/lib/types";

type SellForm = {
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

function createEmptyForm(): SellForm {
  return {
    title: "",
    price: "",
    description: "",
    category: "furniture",
    condition: "Good",
    state: "Anambra",
    city: "Onitsha",
    area: "GRA",
    photos: [],
  };
}

export default function SellPage() {
  return (
    <Suspense fallback={<SellPageFallback />}>
      <SellPageKeyed />
    </Suspense>
  );
}

function SellPageKeyed() {
  const editId = useSearchParams().get("edit");
  return <SellPageContent key={editId ?? "create"} editId={editId} />;
}

function SellPageFallback() {
  return (
    <main className="space-y-3 pb-[96px] pt-3">
      <div className="h-8 w-40 rounded skeleton" />
      <div className="h-2 rounded-full skeleton" />
      <div className="touch-card h-64 skeleton" />
    </main>
  );
}

function SellPageContent({ editId }: { editId: string | null }) {
  const router = useRouter();
  const { showSaveToast } = useSaveToast();
  const supabase = useMemo(() => createClient(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<SellForm | null>(editId ? null : createEmptyForm());
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId));

  const isEditMode = Boolean(editId);
  const cities = getCitiesForState(form?.state ?? "Anambra");
  const areas = getAreasForCity(form?.state ?? "Anambra", form?.city ?? "Onitsha");
  const currentStep = SELL_FLOW_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / SELL_FLOW_STEPS.length) * 100;

  useEffect(() => {
    if (!form) {
      setPhotoPreviews([]);
      return;
    }

    const previews = form.photos.map((photo) =>
      photo.source === "existing" ? photo.url : URL.createObjectURL(photo.file),
    );
    setPhotoPreviews(previews);

    return () => {
      previews.forEach((preview, index) => {
        if (form.photos[index]?.source === "new") {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [form]);

  useEffect(() => {
    async function requireUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      }
    }

    requireUser();
  }, [router, supabase]);

  useEffect(() => {
    if (!editId) {
      return;
    }

    let cancelled = false;

    async function loadListingForEdit() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          id,
          title,
          category,
          condition,
          price,
          description,
          state,
          city,
          area,
          status,
          listing_images (
            image_url,
            position
          )
        `,
        )
        .eq("id", editId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        router.replace("/my-listings");
        return;
      }

      const images = [...(data.listing_images ?? [])].sort(
        (first, second) => first.position - second.position,
      );
      const normalizedCategory = normalizeCategorySlug(data.category);

      setForm({
        listingId: data.id,
        originalStatus: data.status as ListingStatus,
        title: data.title,
        price: String(Number(data.price)),
        description: data.description,
        category: normalizedCategory ?? "furniture",
        condition: data.condition as ListingCondition,
        state: data.state as EasternState,
        city: data.city,
        area: data.area,
        photos: images.map((image) => ({
          source: "existing" as const,
          url: image.image_url,
          id: `existing-${image.image_url}`,
        })),
      });
      setIsLoadingEdit(false);
    }

    void loadListingForEdit();

    return () => {
      cancelled = true;
    };
  }, [editId, router, supabase]);

  const canContinue = useMemo(() => {
    if (!form) {
      return false;
    }

    if (stepIndex === 0) {
      return form.photos.length > 0;
    }

    if (stepIndex === 1) {
      return Boolean(
        form.title.trim() &&
          form.description.trim() &&
          Number(form.price) > 0 &&
          form.category &&
          form.condition,
      );
    }

    if (stepIndex === 2) {
      return Boolean(form.state && form.city && form.area);
    }

    return true;
  }, [form, stepIndex]);

  function updateState(nextState: EasternState) {
    const nextCity = getCitiesForState(nextState)[0]?.name ?? "";
    setForm((prev) =>
      prev
        ? {
            ...prev,
            state: nextState,
            city: nextCity,
            area: getAreasForCity(nextState, nextCity)[0] ?? "",
          }
        : prev,
    );
  }

  function updateCity(nextCity: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            city: nextCity,
            area: getAreasForCity(prev.state, nextCity)[0] ?? "",
          }
        : prev,
    );
  }

  async function saveListing() {
    if (!form) {
      return;
    }

    console.log("[publish] Publish button clicked", {
      photoCount: form.photos.length,
      isEditMode,
      listingId: form.listingId ?? editId ?? null,
    });

    setIsPublishing(true);
    setErrorMessage("");

    let uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("[publish] Auth check failed", userError);
        router.push("/login");
        return;
      }

      const existingListingId = form.listingId ?? editId ?? undefined;
      const createListingId = existingListingId ? undefined : crypto.randomUUID();
      const listingId = existingListingId ?? createListingId;

      if (!listingId) {
        throw new Error("Could not determine listing id for upload.");
      }

      for (const photo of form.photos) {
        if (photo.source === "new") {
          logSellPhotoFile("before-upload", photo.file);
        }
      }

      console.log("[publish] Uploading photos to storage", {
        listingId,
        photoCount: form.photos.length,
      });

      const uploadResult = await uploadListingPhotos(supabase, user.id, listingId, form.photos);
      uploadedPaths = uploadResult.uploadedPaths;

      const payload = buildSaveListingPayload(form, uploadResult.photos, {
        editListingId: editId,
        createListingId,
      });

      console.log("[publish] Calling server action...", {
        mode: payload.mode,
        listingId: payload.listingId,
        photoCount: payload.photos.length,
      });

      const dispatchStartedAt = performance.now();
      const result = await saveListingAction(payload);
      console.log("[publish] Client received response", {
        result,
        dispatchMs: Math.round(performance.now() - dispatchStartedAt),
      });

      if (!result.success) {
        console.error("[publish] Server action returned error", result.error);
        setErrorMessage(result.error);
        showSaveToast(result.error);
        await deleteUploadedListingPhotos(supabase, uploadedPaths);
        return;
      }

      router.refresh();

      if (result.data?.mode === "updated") {
        showSaveToast("Listing updated successfully.");
        setUpdated(true);
        return;
      }

      showSaveToast("Listing submitted for review.");
      setPublished(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : typeof error === "string"
            ? error
            : JSON.stringify(error);

      console.error("[publish] Publish failed", {
        error,
        message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      setErrorMessage(message);
      showSaveToast(message);
      await deleteUploadedListingPhotos(supabase, uploadedPaths);
    } finally {
      setIsPublishing(false);
      console.log("[publish] Publish loading reset");
    }
  }

  if (isLoadingEdit || !form) {
    return <SellPageFallback />;
  }

  if (updated) {
    return (
      <main className="flex min-h-[calc(100dvh-128px)] items-center justify-center py-4">
        <section
          className="touch-card w-full p-4 text-center"
          style={{ animation: "publish-rise 260ms ease-out" }}
        >
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="type-page-title mt-3">Listing updated.</h1>
          <p className="mt-1.5 text-[13px] leading-5 text-muted">
            Your changes were saved to this listing.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/my-listings")}
            className="mt-3 h-11 w-full rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground"
          >
            Back to My listings
          </button>
        </section>
      </main>
    );
  }

  if (published) {
    return (
      <main className="flex min-h-[calc(100dvh-128px)] items-center justify-center py-4">
        <section
          className="touch-card w-full p-4 text-center"
          style={{ animation: "publish-rise 260ms ease-out" }}
        >
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="type-page-title mt-3">
            Listing submitted for review.
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-muted">
            We&apos;ll check it before it appears on {BRAND_NAME}. Most clean
            household listings can go live quickly.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted">
            <div className="rounded-[12px] border border-border p-2">Photos saved</div>
            <div className="rounded-[12px] border border-border p-2">Location set</div>
            <div className="rounded-[12px] border border-border p-2">Pending review</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPublished(false);
              setStepIndex(0);
            }}
            className="mt-3 h-11 w-full rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground"
          >
            Post another item
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-3 pb-[96px] pt-3">
      <section className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="type-page-title">
              {isEditMode ? "Edit your listing" : "Create your listing"}
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {isEditMode
                ? "Update photos, details, and location."
                : "Add photos, details, and submit for review."}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10.5px] font-medium text-primary">
            <Save size={12} />
            {isEditMode ? "Update" : "Review required"}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-primary transition-all duration-app"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-0.5 text-[10.5px] font-medium text-muted">
          {SELL_FLOW_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(index)}
              className={index === stepIndex ? "text-primary" : ""}
            >
              {step.label}
            </button>
          ))}
        </div>
      </section>

      <section className="touch-card mb-3 p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="type-step-title">{currentStep.label}</h2>
          <span className="text-[11px] text-muted">
            {stepIndex + 1}/{SELL_FLOW_STEPS.length}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] leading-4 text-muted">{currentStep.helper}</p>

        <div className="mt-2.5">
          {stepIndex === 0 ? (
            <PhotosStep
              photos={form.photos}
              photoPreviews={photoPreviews}
              onPhotosChange={(photos) => setForm((prev) => (prev ? { ...prev, photos } : prev))}
              onPhotoError={(message) => {
                setErrorMessage(message);
                showSaveToast(message);
              }}
            />
          ) : null}
          {stepIndex === 1 ? (
            <DetailsStep form={form} setForm={setForm} editId={editId} />
          ) : null}
          {stepIndex === 2 ? (
            <LocationStep
              state={form.state}
              setState={updateState}
              city={form.city}
              setCity={updateCity}
              area={form.area}
              setArea={(area) => setForm((prev) => (prev ? { ...prev, area } : prev))}
              cities={cities}
              areas={areas}
            />
          ) : null}
          {stepIndex === 3 ? (
            <PreviewStep
              title={form.title}
              price={form.price}
              photoCount={form.photos.length}
              coverPreview={photoPreviews[0] ?? null}
              state={form.state}
              city={form.city}
              area={form.area}
              condition={form.condition}
              isEditMode={isEditMode}
            />
          ) : null}
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-app border border-border bg-background p-3 text-[12px] text-muted">
            {errorMessage}
          </p>
        ) : null}

        <div
          className={`mt-4 grid gap-2 ${
          stepIndex > 0 ? "grid-cols-[3fr_7fr]" : "grid-cols-1"
        }`}
        >
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStepIndex((index) => index - 1)}
              className="type-btn h-10 rounded-full border border-border bg-surface px-4 text-[13px]"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canContinue || isPublishing}
            onClick={() => {
              if (stepIndex < SELL_FLOW_STEPS.length - 1) {
                setStepIndex((index) => index + 1);
              } else {
                void saveListing();
              }
            }}
            className="type-btn flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[13px] text-primary-foreground disabled:opacity-50"
          >
            {isPublishing
              ? isEditMode
                ? "Updating..."
                : "Publishing..."
              : stepIndex === SELL_FLOW_STEPS.length - 1
                ? isEditMode
                  ? "Update Listing"
                  : "Publish for review"
                : "Continue"}
            {stepIndex === SELL_FLOW_STEPS.length - 1 ? (
              <CheckCircle2 size={17} />
            ) : (
              <ChevronRight size={17} />
            )}
          </button>
        </div>
      </section>
    </main>
  );
}

function PhotosStep({
  photos,
  photoPreviews,
  onPhotosChange,
  onPhotoError,
}: {
  photos: SellPhotoItem[];
  photoPreviews: string[];
  onPhotosChange: (photos: SellPhotoItem[]) => void;
  onPhotoError: (message: string) => void;
}) {
  const photoCount = photos.length;

  async function addPhotos(files: File[]) {
    const remaining = MAX_SELL_PHOTOS - photos.length;
    if (remaining <= 0) {
      return;
    }

    try {
      const selectedFiles = files.slice(0, remaining);
      const normalizedFiles = await Promise.all(
        selectedFiles.map((file) => prepareListingPhoto(file)),
      );

      const nextFiles = normalizedFiles.map((file) => ({
        source: "new" as const,
        file,
        id: createSellPhotoId(),
      }));

      onPhotosChange([...photos, ...nextFiles]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not prepare this camera photo for upload.";
      console.error("[publish] Camera photo normalization failed", error);
      onPhotoError(message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] font-semibold">
        <span>{MAX_SELL_PHOTOS - photoCount} photo slots left</span>
        <span className="text-muted">{photoCount}/{MAX_SELL_PHOTOS}</span>
      </div>
      <label className="block rounded-app border border-dashed border-border bg-background p-3 text-center text-[13px] font-semibold text-primary">
        {photoCount > 0 ? "Add more photos" : "Upload photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void addPhotos(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      <SellPhotoGrid
        photos={photos}
        photoPreviews={photoPreviews}
        onPhotosChange={onPhotosChange}
      />
    </div>
  );
}

function DetailsStep({
  form,
  setForm,
  editId,
}: {
  form: SellForm;
  setForm: React.Dispatch<React.SetStateAction<SellForm | null>>;
  editId: string | null;
}) {
  return (
    <div className="space-y-2">
      <Field label="Title">
        <input
          value={form.title}
          onChange={(event) => {
            setForm((prev) => (prev ? { ...prev, title: event.target.value } : prev));
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          name={editId ? `listing-title-${editId}` : "listing-title-new"}
          className="w-full bg-transparent outline-none"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Price">
          <input
            value={form.price}
            onChange={(event) =>
              setForm((prev) => (prev ? { ...prev, price: event.target.value } : prev))
            }
            inputMode="numeric"
            className="w-full bg-transparent outline-none"
          />
        </Field>
        <Field label="Condition">
          <CustomSelect
            value={form.condition}
            onChange={(value) =>
              setForm((prev) =>
                prev ? { ...prev, condition: value as ListingCondition } : prev,
              )
            }
            options={LISTING_CONDITIONS.map((condition) => ({
              label: condition,
              value: condition,
            }))}
          />
        </Field>
      </div>
      <Field label="Category">
        <CustomSelect
          value={form.category}
          onChange={(value) =>
            setForm((prev) =>
              prev ? { ...prev, category: value as ListingCategorySlug } : prev,
            )
          }
          options={CATEGORIES.map((category) => ({
            label: category.name,
            value: category.slug,
          }))}
          searchPlaceholder="Search category..."
          searchable
        />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
          }
          className="h-28 w-full resize-none bg-transparent outline-none"
        />
      </Field>
    </div>
  );
}

function LocationStep(props: {
  state: EasternState;
  setState: (value: EasternState) => void;
  city: string;
  setCity: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  cities: { name: string; areas: string[] }[];
  areas: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-[11px] font-normal text-primary">
        <BadgeCheck size={13} />
        Default region: Eastern Nigeria
      </p>
      <Field label="State">
        <CustomSelect
          value={props.state}
          onChange={(value) => props.setState(value as EasternState)}
          options={EASTERN_NIGERIA_LOCATIONS.map((location) => ({
            label: location.state,
            value: location.state,
          }))}
          searchPlaceholder="Search state..."
          searchable
        />
      </Field>
      <Field label="City">
        <CustomSelect
          value={props.city}
          onChange={props.setCity}
          options={props.cities.map((city) => ({
            label: city.name,
            value: city.name,
          }))}
          searchPlaceholder="Search city..."
          searchable
        />
      </Field>
      <Field label="Area">
        <CustomSelect
          value={props.area}
          onChange={props.setArea}
          options={props.areas.map((area) => ({
            label: area,
            value: area,
          }))}
        />
      </Field>
    </div>
  );
}

function PreviewStep(props: {
  title: string;
  price: string;
  photoCount: number;
  coverPreview: string | null;
  state: EasternState;
  city: string;
  area: string;
  condition: ListingCondition;
  isEditMode?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="relative aspect-square w-full overflow-hidden rounded-none bg-background">
          {props.coverPreview ? (
            <PreviewImage
              src={props.coverPreview}
              alt={props.title || "Listing cover preview"}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center gap-2 text-muted">
              <Camera size={24} />
              <span className="text-[12px] font-semibold">No cover selected</span>
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
            {props.photoCount} photo{props.photoCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="space-y-1 p-2">
          <div className="flex items-start justify-between gap-2">
            <p className="type-card-price text-[13px]">
              {formatNaira(Number(props.price || 0))}
            </p>
            <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {props.condition}
            </span>
          </div>
          <h3 className="type-card-title line-clamp-2">
            {props.title || "Listing title"}
          </h3>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
            <span className="truncate">
              {props.area}, {props.city}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              Preview
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <PreviewItem label="Photos" value={`${props.photoCount}/${MAX_SELL_PHOTOS}`} />
        <PreviewItem label="Condition" value={props.condition} />
        <PreviewItem label="Location" value={`${props.area}, ${props.city}`} />
        <PreviewItem
          label="Review"
          value={props.isEditMode ? "Saved to this listing" : "Pending after publish"}
        />
      </div>
      <p className="flex items-center gap-1 text-[12px] text-muted">
        <Clock3 size={13} />
        {props.isEditMode
          ? "Your changes will update this listing."
          : "Your listing will be saved as pending after publish."}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-[12px] border border-border bg-background px-2.5 py-2">
      <span className="type-field-label block">{label}</span>
      <div className="type-field-value mt-0.5">{children}</div>
    </label>
  );
}

type SelectOption = {
  label: string;
  value: string;
};

function CustomSelect({
  options,
  value,
  onChange,
  searchable,
  searchPlaceholder = "Search...",
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({
    left: 12,
    top: 12,
    width: 280,
  });
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function updatePosition() {
      if (!rootRef.current) {
        return;
      }

      const rect = rootRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const viewportPadding = 12;
      const footerReserve = 104;
      const menuHeight = 176;
      const gap = 6;
      const width = Math.min(rect.width, viewportWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        viewportWidth - width - viewportPadding,
      );
      const spaceBelow = viewportHeight - rect.bottom - footerReserve;
      const shouldOpenUp = spaceBelow < 260 && rect.top > menuHeight + gap;
      const top = shouldOpenUp
        ? Math.max(viewportPadding, rect.top - menuHeight - gap)
        : Math.max(
            viewportPadding,
            Math.min(rect.bottom + gap, viewportHeight - menuHeight - footerReserve),
          );

      setPanelPosition({ left, top, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  function toggleOpen() {
    setIsOpen((current) => !current);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-2 py-0.5 text-left"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">{selectedOption?.label ?? "Select"}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-muted transition duration-app ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen
        ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] max-h-[176px] overflow-y-auto rounded-[12px] border border-border bg-surface p-1 shadow-lg [scrollbar-color:var(--primary)_transparent] [scrollbar-width:thin]"
          style={{
            left: panelPosition.left,
            top: panelPosition.top,
            width: panelPosition.width,
          }}
        >
          {searchable ? (
            <div className="sticky top-0 z-10 bg-surface pb-1">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-[8px] border border-border bg-background px-2.5 text-[12px] font-normal text-foreground outline-none placeholder:text-muted focus:border-primary/60"
                autoFocus
              />
            </div>
          ) : null}

          <div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectOption(option.value)}
                    className={`flex h-9 w-full items-center rounded-[8px] px-2.5 text-left text-[13px] transition duration-app ${
                      selected
                        ? "bg-primary/12 font-medium text-primary"
                        : "font-normal text-foreground hover:bg-background"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <div className="px-2.5 py-3 text-center text-[12px] text-muted">
                No matches
              </div>
            )}
          </div>
        </div>,
        document.body,
          )
        : null}
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border p-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 text-[12px] font-medium">{value}</p>
    </div>
  );
}
