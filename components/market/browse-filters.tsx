"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet, BottomSheetOption } from "@/components/ui/bottom-sheet";
import { useHorizontalWheelScroll } from "@/lib/hooks/use-horizontal-wheel-scroll";
import type { LocationTreeState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type FilterSheet = "location" | "price" | "condition" | null;
type LocationStep = "state" | "city" | "area";

export type BrowseFilterCondition =
  | "All"
  | "New"
  | "Like new"
  | "Used"
  | "Needs repair";

type PricePreset = {
  label: string;
  min: number;
  max: number;
};

export const BROWSE_PRICE_OPTIONS: PricePreset[] = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under ₦100k", min: 0, max: 100000 },
  { label: "₦100k – ₦500k", min: 100000, max: 500000 },
  { label: "₦500k – ₦2M", min: 500000, max: 2000000 },
  { label: "₦2M – ₦10M", min: 2000000, max: 10000000 },
  { label: "₦10M – ₦50M", min: 10000000, max: 50000000 },
  { label: "Above ₦50M", min: 50000000, max: Infinity },
];

/** @deprecated Use BROWSE_PRICE_OPTIONS */
export const BROWSE_PRICE_FILTERS = BROWSE_PRICE_OPTIONS;

export const BROWSE_FILTER_CONDITIONS: {
  label: string;
  value: BrowseFilterCondition;
}[] = [
  { label: "Any", value: "All" },
  { label: "New", value: "New" },
  { label: "Like new", value: "Like new" },
  { label: "Used", value: "Used" },
  { label: "Needs repair", value: "Needs repair" },
];

export function resolveBrowsePriceBounds(priceIndex: number): {
  min: number;
  max: number;
} {
  const option = BROWSE_PRICE_OPTIONS[priceIndex];

  if (!option) {
    return { min: 0, max: Infinity };
  }

  return { min: option.min, max: option.max };
}

export function getBrowsePriceLabel(priceIndex: number): string {
  if (priceIndex === 0) {
    return "Price";
  }

  return BROWSE_PRICE_OPTIONS[priceIndex]?.label ?? "Price";
}

export function matchesBrowseCondition(
  listingCondition: string,
  filter: BrowseFilterCondition,
): boolean {
  if (filter === "All") {
    return true;
  }

  if (filter === "Used") {
    return (
      listingCondition === "Used" ||
      listingCondition === "Good" ||
      listingCondition === "Fair"
    );
  }

  return listingCondition === filter;
}

type BrowseFiltersProps = {
  locationTree: LocationTreeState[];
  state: string | "All";
  city: string;
  area: string;
  condition: BrowseFilterCondition;
  priceIndex: number;
  locationSheetOpen?: boolean;
  onLocationSheetClose?: () => void;
  showCondition?: boolean;
  onLocationChange: (value: {
    state: string | "All";
    city: string;
    area: string;
  }) => void;
  onConditionChange: (value: BrowseFilterCondition) => void;
  onPriceChange: (index: number) => void;
};

export function BrowseFilters({
  locationTree,
  state,
  city,
  area,
  condition,
  priceIndex,
  locationSheetOpen,
  onLocationSheetClose,
  showCondition = true,
  onLocationChange,
  onConditionChange,
  onPriceChange,
}: BrowseFiltersProps) {
  const [activeSheet, setActiveSheet] = useState<FilterSheet>(null);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(filterScrollRef);

  useEffect(() => {
    if (locationSheetOpen) {
      setActiveSheet("location");
    }
  }, [locationSheetOpen]);

  function closeLocationSheet() {
    setActiveSheet(null);
    onLocationSheetClose?.();
  }

  function closeSheet() {
    setActiveSheet(null);
    onLocationSheetClose?.();
  }

  const locationActive = state !== "All" || city !== "All" || area !== "All";
  const priceActive = priceIndex !== 0;
  const conditionActive = condition !== "All";

  const locationValue =
    area !== "All" ? area : city !== "All" ? city : state !== "All" ? state : null;

  const locationLabel = locationValue ?? "Location";
  const priceLabel = getBrowsePriceLabel(priceIndex);
  const conditionLabel =
    condition === "All"
      ? "Condition"
      : BROWSE_FILTER_CONDITIONS.find((entry) => entry.value === condition)?.label ??
        condition;

  return (
    <>
      <div ref={filterScrollRef} className="market-hscroll">
        <div className="market-hscroll-inner">
          <FilterPill
            label={locationLabel}
            active={locationActive}
            onClick={() => setActiveSheet("location")}
          />
          <FilterPill
            label={priceLabel}
            active={priceActive}
            onClick={() => setActiveSheet("price")}
          />
          {showCondition ? (
            <FilterPill
              label={conditionLabel}
              active={conditionActive}
              onClick={() => setActiveSheet("condition")}
            />
          ) : null}
        </div>
      </div>

      <LocationFilterSheet
        open={activeSheet === "location"}
        onClose={closeLocationSheet}
        locationTree={locationTree}
        state={state}
        city={city}
        area={area}
        onApply={(next) => {
          onLocationChange(next);
          closeLocationSheet();
        }}
      />

      <BottomSheet
        open={activeSheet === "price"}
        onClose={closeSheet}
        title="Price"
      >
        {BROWSE_PRICE_OPTIONS.map((price, index) => (
          <BottomSheetOption
            key={price.label}
            label={price.label}
            selected={priceIndex === index}
            onSelect={() => {
              onPriceChange(index);
              closeSheet();
            }}
          />
        ))}
      </BottomSheet>

      {showCondition ? (
        <BottomSheet
          open={activeSheet === "condition"}
          onClose={closeSheet}
          title="Condition"
        >
          {BROWSE_FILTER_CONDITIONS.map((option) => (
            <BottomSheetOption
              key={option.value}
              label={option.label}
              selected={condition === option.value}
              onSelect={() => {
                onConditionChange(option.value);
                closeSheet();
              }}
            />
          ))}
        </BottomSheet>
      ) : null}
    </>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("market-filter-btn snap-start", active && "is-active")}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ChevronDown size={12} strokeWidth={2.2} className="shrink-0 opacity-60" aria-hidden />
    </button>
  );
}

function LocationFilterSheet({
  open,
  onClose,
  locationTree,
  state,
  city,
  area,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  locationTree: LocationTreeState[];
  state: string | "All";
  city: string;
  area: string;
  onApply: (value: {
    state: string | "All";
    city: string;
    area: string;
  }) => void;
}) {
  const [step, setStep] = useState<LocationStep>("state");
  const [draftState, setDraftState] = useState<string | "All">("All");
  const [draftCity, setDraftCity] = useState("All");

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("state");
    setDraftState(state);
    setDraftCity(city);
  }, [open, state, city, area]);

  const cities = useMemo(() => {
    if (draftState === "All") {
      return [];
    }

    return (
      locationTree.find((entry) => entry.name === draftState)?.cities ?? []
    );
  }, [draftState, locationTree]);

  const areas = useMemo(() => {
    if (draftCity === "All") {
      return [];
    }

    return cities.find((entry) => entry.name === draftCity)?.areas ?? [];
  }, [cities, draftCity]);

  const title =
    step === "state" ? "Location" : step === "city" ? draftState : draftCity;

  function handleBack() {
    if (step === "area") {
      setStep("city");
      return;
    }

    if (step === "city") {
      setStep("state");
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      onBack={step === "state" ? undefined : handleBack}
    >
      {step === "state" ? (
        <>
          <BottomSheetOption
            label="All locations"
            selected={state === "All" && city === "All" && area === "All"}
            onSelect={() => onApply({ state: "All", city: "All", area: "All" })}
          />
          {locationTree.map((entry) => (
            <BottomSheetOption
              key={entry.id}
              label={entry.name}
              selected={draftState === entry.name}
              onSelect={() => {
                setDraftState(entry.name);
                setDraftCity("All");
                setStep("city");
              }}
            />
          ))}
        </>
      ) : null}

      {step === "city" ? (
        <>
          <BottomSheetOption
            label={`All in ${draftState}`}
            selected={state === draftState && city === "All" && area === "All"}
            onSelect={() =>
              onApply({ state: draftState, city: "All", area: "All" })
            }
          />
          {cities.map((cityEntry) => (
            <BottomSheetOption
              key={cityEntry.id}
              label={cityEntry.name}
              selected={draftCity === cityEntry.name}
              onSelect={() => {
                setDraftCity(cityEntry.name);
                setStep("area");
              }}
            />
          ))}
        </>
      ) : null}

      {step === "area" ? (
        <>
          <BottomSheetOption
            label={`All in ${draftCity}`}
            selected={state === draftState && city === draftCity && area === "All"}
            onSelect={() =>
              onApply({ state: draftState, city: draftCity, area: "All" })
            }
          />
          {areas.map((areaOption) => (
            <BottomSheetOption
              key={areaOption.id}
              label={areaOption.name}
              selected={area === areaOption.name}
              onSelect={() =>
                onApply({
                  state: draftState,
                  city: draftCity,
                  area: areaOption.name,
                })
              }
            />
          ))}
        </>
      ) : null}
    </BottomSheet>
  );
}
