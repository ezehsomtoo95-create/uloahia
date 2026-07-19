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
import { LISTING_CONDITIONS, SELL_FLOW_STEPS } from "@/lib/constants/listings";
import { saveListing as saveListingAction } from "@/app/actions/sell";
import { SellPhotoGrid } from "@/components/sell/sell-photo-grid";
import { PreviewImage } from "@/components/ui/preview-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { MAX_SELL_PHOTOS, createSellPhotoId, type SellPhotoItem } from "@/lib/sell/photos";
import { compressListingPhoto, compressSellPhotoItems } from "@/lib/sell/compress-listing-photo";
import { buildSaveListingFormData } from "@/lib/sell/build-save-form-data";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";

import { createClient } from "@/lib/supabase/client";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";
import { getAreasForCity, getCitiesForState } from "@/lib/utils/location-tree";
import type {
  CategoryAttributeField,
  CategoryTreeNode,
  ListingAttributes,
  ListingCondition,
  ListingStatus,
  LocationTreeState,
} from "@/lib/types";

type SellForm = {
  listingId?: string;
  originalStatus?: ListingStatus;
  title: string;
  price: string;
  description: string;
  categoryId: string;
  category: string;
  parentCategoryId: string;
  attributes: ListingAttributes;
  condition: ListingCondition | "";
  countryId: string;
  country: string;
  stateId: string;
  state: string;
  cityId: string;
  city: string;
  areaId: string;
  area: string;
  photos: SellPhotoItem[];
};

type DefaultSellLocation = {
  countryId: string;
  country: string;
  stateId: string;
  state: string;
  cityId: string;
  city: string;
  areaId: string;
  area: string;
} | null;

type SellPageClientProps = {
  categoryTree: CategoryTreeNode[];
  attributeSchemas: CategoryAttributeField[];
  locationTree: LocationTreeState[];
  defaultLocation: DefaultSellLocation;
};

function hasAttributeValue(value: ListingAttributes[string] | undefined) {
  return value !== undefined && value !== null && value !== "";
}

function createEmptyForm(defaultLocation: DefaultSellLocation): SellForm {
  return {
    title: "",
    price: "",
    description: "",
    categoryId: "",
    category: "",
    parentCategoryId: "",
    attributes: {},
    condition: "",
    countryId: defaultLocation?.countryId ?? "",
    country: defaultLocation?.country ?? "Nigeria",
    stateId: defaultLocation?.stateId ?? "",
    state: defaultLocation?.state ?? "",
    cityId: defaultLocation?.cityId ?? "",
    city: defaultLocation?.city ?? "",
    areaId: defaultLocation?.areaId ?? "",
    area: defaultLocation?.area ?? "",
    photos: [],
  };
}

export function SellPageClient(props: SellPageClientProps) {
  return (
    <Suspense fallback={<SellPageFallback />}>
      <SellPageKeyed {...props} />
    </Suspense>
  );
}

function SellPageKeyed(props: SellPageClientProps) {
  const editId = useSearchParams().get("edit");
  return <SellPageContent key={editId ?? "create"} editId={editId} {...props} />;
}

function SellPageFallback() {
  return (
    <main className="sell-studio">
      <div className="h-8 w-48 rounded skeleton" />
      <div className="sell-studio-progress skeleton" />
      <div className="h-72 rounded-xl skeleton" />
    </main>
  );
}

function SellPageContent({
  editId,
  categoryTree,
  attributeSchemas,
  locationTree,
  defaultLocation,
}: SellPageClientProps & { editId: string | null }) {
  const router = useRouter();
  const { showSaveToast } = useSaveToast();
  const supabase = useMemo(() => createClient(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<SellForm | null>(
    editId ? null : createEmptyForm(defaultLocation),
  );
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId));
  const [hasAuthCheck, setHasAuthCheck] = useState(false);

  const isEditMode = Boolean(editId);
  const cities = getCitiesForState(locationTree, form?.stateId ?? "");
  const areas = getAreasForCity(locationTree, form?.stateId ?? "", form?.cityId ?? "");
  const selectedParent = categoryTree.find((category) => category.id === form?.parentCategoryId);
  const selectedCategory = selectedParent?.children.find(
    (category) => category.id === form?.categoryId,
  );
  const showCondition =
    selectedParent?.showCondition !== false && selectedCategory?.showCondition !== false;
  const selectedAttributes = attributeSchemas.filter(
    (field) => field.categoryId === form?.categoryId,
  );
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
    let cancelled = false;

    async function requireUser() {
      const session = await waitForInitialAuthSession(supabase);

      if (cancelled) {
        return;
      }

      setHasAuthCheck(true);

      if (!session?.user) {
        router.replace(buildAuthHref("login", "/sell"));
      }
    }

    void requireUser();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!editId) {
      return;
    }

    let cancelled = false;

    async function loadListingForEdit() {
      const session = await waitForInitialAuthSession(supabase);
      const user = session?.user;

      if (!user) {
        router.replace(buildAuthHref("login", "/sell"));
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          id,
          title,
          category_id,
          category,
          attributes,
          condition,
          price,
          description,
          country_id,
          country,
          state_id,
          state,
          city_id,
          city,
          area_id,
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
      const parent = categoryTree.find((entry) =>
        entry.children.some(
          (child) => child.id === data.category_id || child.slug === data.category,
        ),
      );
      const category = parent?.children.find(
        (child) => child.id === data.category_id || child.slug === data.category,
      );
      const state = locationTree.find(
        (entry) => entry.id === data.state_id || entry.name === data.state,
      );
      const city = state?.cities.find(
        (entry) => entry.id === data.city_id || entry.name === data.city,
      );
      const area = city?.areas.find(
        (entry) => entry.id === data.area_id || entry.name === data.area,
      );

      setForm({
        listingId: data.id,
        originalStatus: data.status as ListingStatus,
        title: data.title,
        price: String(Number(data.price)),
        description: data.description,
        categoryId: category?.id ?? data.category_id ?? "",
        category: category?.slug ?? data.category,
        parentCategoryId: parent?.id ?? "",
        attributes:
          data.attributes && typeof data.attributes === "object"
            ? (data.attributes as ListingAttributes)
            : {},
        condition: LISTING_CONDITIONS.includes(data.condition as ListingCondition)
          ? (data.condition as ListingCondition)
          : "",
        countryId: data.country_id ?? defaultLocation?.countryId ?? "",
        country: data.country ?? defaultLocation?.country ?? "Nigeria",
        stateId: state?.id ?? data.state_id ?? "",
        state: state?.name ?? data.state,
        cityId: city?.id ?? data.city_id ?? "",
        city: city?.name ?? data.city,
        areaId: area?.id ?? data.area_id ?? "",
        area: area?.name ?? data.area,
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
  }, [categoryTree, defaultLocation, editId, locationTree, router, supabase]);

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
          form.categoryId &&
          (!showCondition || form.condition) &&
          selectedAttributes.every(
            (field) => !field.required || hasAttributeValue(form.attributes[field.fieldKey]),
          ),
      );
    }

    if (stepIndex === 2) {
      return Boolean(form.stateId && form.cityId && form.areaId);
    }

    return true;
  }, [form, selectedAttributes, showCondition, stepIndex]);

  function updateState(nextStateId: string) {
    const nextState = locationTree.find((state) => state.id === nextStateId);
    const nextCity = getCitiesForState(locationTree, nextStateId)[0];
    const nextArea = nextCity
      ? getAreasForCity(locationTree, nextStateId, nextCity.id)[0]
      : undefined;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            stateId: nextState?.id ?? "",
            state: nextState?.name ?? "",
            cityId: nextCity?.id ?? "",
            city: nextCity?.name ?? "",
            areaId: nextArea?.id ?? "",
            area: nextArea?.name ?? "",
          }
        : prev,
    );
  }

  function updateCity(nextCityId: string) {
    setForm((prev) =>
      prev
        ? (() => {
            const nextCity = getCitiesForState(locationTree, prev.stateId).find(
              (city) => city.id === nextCityId,
            );
            const nextArea = getAreasForCity(
              locationTree,
              prev.stateId,
              nextCityId,
            )[0];
            return {
            ...prev,
            cityId: nextCity?.id ?? "",
            city: nextCity?.name ?? "",
            areaId: nextArea?.id ?? "",
            area: nextArea?.name ?? "",
            };
          })()
        : prev,
    );
  }

  async function saveListing() {
    if (!form) {
      return;
    }

    setIsPublishing(true);
    setErrorMessage("");

    try {
      const session = await waitForInitialAuthSession(supabase);
      const user = session?.user;

      if (!user) {
        router.replace(buildAuthHref("login", "/sell"));
        return;
      }

      if (!user.email_confirmed_at) {
        const message = "Verify your email before publishing listings.";
        setErrorMessage(message);
        showSaveToast(message);
        return;
      }

      if (!form.categoryId || (showCondition && !form.condition)) {
        const message = "Select a category and condition before publishing.";
        setErrorMessage(message);
        showSaveToast(message);
        return;
      }

      const compressedPhotos = await compressSellPhotoItems(form.photos);
      const result = await saveListingAction(
        buildSaveListingFormData(
          {
            ...form,
            category: form.category,
            condition: form.condition || "Good",
            photos: compressedPhotos,
          },
          editId,
        ),
      );

      if (!result.success) {
        setErrorMessage(result.error);
        showSaveToast(result.error);
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
      console.error("CLIENT LISTING ACTION ERROR:", error);

      const digest =
        error && typeof error === "object" && "digest" in error
          ? String((error as { digest?: string }).digest ?? "")
          : "";
      const baseMessage =
        error instanceof Error
          ? error.message
          : "Could not publish listing. Please try again.";
      const message = digest ? `${baseMessage} (digest: ${digest})` : baseMessage;

      setErrorMessage(message);
      showSaveToast(message);
    } finally {
      setIsPublishing(false);
    }
  }

  if (!hasAuthCheck || isLoadingEdit || !form) {
    return <SellPageFallback />;
  }

  if (updated) {
    return (
      <main className="sell-studio">
        <section className="sell-studio-done">
          <div className="sell-studio-done-mark">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="market-page-title">Listing updated</h1>
          <p className="market-page-sub">Your changes were saved to this listing.</p>
          <button
            type="button"
            onClick={() => router.replace("/my-listings")}
            className="market-empty-cta mt-2 w-full max-w-xs"
          >
            Back to My listings
          </button>
        </section>
      </main>
    );
  }

  if (published) {
    return (
      <main className="sell-studio">
        <section className="sell-studio-done">
          <div className="sell-studio-done-mark">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="market-page-title">Submitted for review</h1>
          <p className="market-page-sub max-w-sm">
            We&apos;ll check it before it appears on {BRAND_NAME}. Clean listings usually go live
            quickly.
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold text-muted">
            <li className="rounded-full border border-border px-2.5 py-1">Photos saved</li>
            <li className="rounded-full border border-border px-2.5 py-1">Location set</li>
            <li className="rounded-full border border-border px-2.5 py-1">Pending review</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              setPublished(false);
              setStepIndex(0);
            }}
            className="market-empty-cta mt-2 w-full max-w-xs"
          >
            Post another item
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="sell-studio">
      <section className="sell-studio-head">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="market-page-title">
              {isEditMode ? "Edit listing" : "Sell an item"}
            </h1>
            <p className="market-page-sub">
              {isEditMode
                ? "Update photos, details, and location."
                : "Photos first — then details, location, and review."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10.5px] font-medium text-primary">
            <Save size={12} />
            {isEditMode ? "Update" : "Review required"}
          </span>
        </div>

        <div className="sell-studio-progress">
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="sell-studio-steps">
          {SELL_FLOW_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(index)}
              className={index === stepIndex ? "is-active" : undefined}
            >
              {step.label}
            </button>
          ))}
        </div>
      </section>

      <section className="sell-studio-panel">
        <div className="sell-studio-panel-head">
          <div>
            <h2 className="type-step-title">{currentStep.label}</h2>
            <p className="mt-0.5 text-[12px] leading-4 text-muted">{currentStep.helper}</p>
          </div>
          <span className="text-[11px] text-muted">
            {stepIndex + 1}/{SELL_FLOW_STEPS.length}
          </span>
        </div>

        <div>
          {stepIndex === 0 ? (
            <PhotosStep
              photos={form.photos}
              photoPreviews={photoPreviews}
              onPhotosChange={(photos) => setForm((prev) => (prev ? { ...prev, photos } : prev))}
            />
          ) : null}
          {stepIndex === 1 ? (
            <DetailsStep
              form={form}
              setForm={setForm}
              categoryTree={categoryTree}
              selectedParent={selectedParent}
              selectedAttributes={selectedAttributes}
              showCondition={showCondition}
            />
          ) : null}
          {stepIndex === 2 ? (
            <LocationStep
              stateId={form.stateId}
              setState={updateState}
              cityId={form.cityId}
              setCity={updateCity}
              areaId={form.areaId}
              setArea={(areaId) =>
                setForm((prev) => {
                  const area = areas.find((entry) => entry.id === areaId);
                  return prev
                    ? { ...prev, areaId, area: area?.name ?? "" }
                    : prev;
                })
              }
              locationTree={locationTree}
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
          <p className="rounded-app border border-border bg-background p-3 text-[12px] text-muted">
            {errorMessage}
          </p>
        ) : null}

        <div
          className={`grid gap-2 ${
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

}: {
  photos: SellPhotoItem[];
  photoPreviews: string[];
  onPhotosChange: (photos: SellPhotoItem[]) => void;
}) {
  const photoCount = photos.length;
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);

  async function addPhotos(files: File[]) {
    const remaining = MAX_SELL_PHOTOS - photos.length;
    if (remaining <= 0 || files.length === 0) {
      return;
    }

    setIsPreparingPhotos(true);

    try {
      const selectedFiles = files.slice(0, remaining);
      const compressedFiles = await Promise.all(
        selectedFiles.map((file) => compressListingPhoto(file)),
      );
      const nextFiles = compressedFiles.map((file) => ({
        source: "new" as const,
        file,
        id: createSellPhotoId(),
      }));

      onPhotosChange([...photos, ...nextFiles]);
    } finally {
      setIsPreparingPhotos(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] font-semibold">
        <span>{MAX_SELL_PHOTOS - photoCount} photo slots left</span>
        <span className="text-muted">
          {photoCount}/{MAX_SELL_PHOTOS}
        </span>
      </div>
      <label
        className={`flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-[color-mix(in_srgb,var(--muted)_10%,var(--surface))] px-3 py-4 text-center ${
          isPreparingPhotos ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Camera size={22} className="text-primary" strokeWidth={1.75} />
        <span className="text-[13px] font-semibold text-primary">
          {photoCount > 0 ? "Add more photos" : "Upload photos"}
        </span>
        <span className="text-[11px] text-muted">Clear, well-lit shots sell faster</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isPreparingPhotos}
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
  categoryTree,
  selectedParent,
  selectedAttributes,
  showCondition,
}: {
  form: SellForm;
  setForm: React.Dispatch<React.SetStateAction<SellForm | null>>;
  categoryTree: CategoryTreeNode[];
  selectedParent?: CategoryTreeNode;
  selectedAttributes: CategoryAttributeField[];
  showCondition: boolean;
}) {
  return (
    <div className="space-y-2">
      <Field label="Title">
        <input
          type="text"
          value={form.title}
          onChange={(event) =>
            setForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
          }
          className="w-full bg-transparent outline-none"
          placeholder="e.g. 6-seater leather sofa"
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
        {showCondition ? (
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
              placeholder="Select condition"
            />
          </Field>
        ) : null}
      </div>
      <Field label="Parent category">
        <CustomSelect
          value={form.parentCategoryId}
          onChange={(value) =>
            setForm((prev) =>
              prev
                ? {
                    ...prev,
                    parentCategoryId: value,
                    categoryId: "",
                    category: "",
                    attributes: {},
                    condition: "",
                  }
                : prev,
            )
          }
          options={categoryTree.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          placeholder="Select parent category"
        />
      </Field>
      <Field label="Category">
        <CustomSelect
          value={form.categoryId}
          onChange={(value) => {
            const category = selectedParent?.children.find((entry) => entry.id === value);
            setForm((prev) =>
              prev
                ? {
                    ...prev,
                    categoryId: category?.id ?? "",
                    category: category?.slug ?? "",
                    attributes: {},
                    condition:
                      selectedParent?.showCondition === false ||
                      category?.showCondition === false
                        ? ""
                        : prev.condition,
                  }
                : prev,
            );
          }}
          options={(selectedParent?.children ?? []).map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          placeholder="Select category"
        />
      </Field>
      {form.categoryId
        ? selectedAttributes.map((field) => (
            <DynamicAttributeField
              key={field.id}
              field={field}
              value={form.attributes[field.fieldKey]}
              onChange={(value) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        attributes: {
                          ...prev.attributes,
                          [field.fieldKey]: value,
                        },
                      }
                    : prev,
                )
              }
            />
          ))
        : null}
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

function DynamicAttributeField({
  field,
  value,
  onChange,
}: {
  field: CategoryAttributeField;
  value: ListingAttributes[string] | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.fieldType === "select") {
    return (
      <Field label={label}>
        <CustomSelect
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={field.options.map((option) => ({ label: option, value: option }))}
          placeholder={`Select ${field.label.toLowerCase()}`}
        />
      </Field>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <Field label={label}>
        <CustomSelect
          value={typeof value === "boolean" ? String(value) : ""}
          onChange={(nextValue) => onChange(nextValue === "true")}
          options={[
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ]}
          placeholder="Select"
        />
      </Field>
    );
  }

  return (
    <Field label={label}>
      <input
        type={field.fieldType}
        inputMode={field.fieldType === "number" ? "numeric" : undefined}
        value={typeof value === "string" || typeof value === "number" ? value : ""}
        onChange={(event) =>
          onChange(
            field.fieldType === "number"
              ? event.target.value === ""
                ? ""
                : Number(event.target.value)
              : event.target.value,
          )
        }
        className="w-full bg-transparent outline-none"
      />
    </Field>
  );
}

function LocationStep(props: {
  stateId: string;
  setState: (value: string) => void;
  cityId: string;
  setCity: (value: string) => void;
  areaId: string;
  setArea: (value: string) => void;
  locationTree: LocationTreeState[];
  cities: LocationTreeState["cities"];
  areas: LocationTreeState["cities"][number]["areas"];
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-[11px] font-normal text-primary">
        <BadgeCheck size={13} />
        Default location: Lagos / Ikeja
      </p>
      <Field label="State">
        <CustomSelect
          value={props.stateId}
          onChange={props.setState}
          options={props.locationTree.map((location) => ({
            label: location.name,
            value: location.id,
          }))}
        />
      </Field>
      <Field label="City">
        <CustomSelect
          value={props.cityId}
          onChange={props.setCity}
          options={props.cities.map((city) => ({
            label: city.name,
            value: city.id,
          }))}
        />
      </Field>
      <Field label="Area">
        <CustomSelect
          value={props.areaId}
          onChange={props.setArea}
          options={props.areas.map((area) => ({
            label: area.name,
            value: area.id,
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
  state: string;
  city: string;
  area: string;
  condition: ListingCondition | "";
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
  placeholder = "Select",
  searchable,
  searchPlaceholder = "Search...",
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        <span
          className={cn(
            "min-w-0 truncate",
            !selectedOption && "font-normal text-muted",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
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
