"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet, BottomSheetOption } from "@/components/ui/bottom-sheet";
import { EASTERN_NIGERIA_LOCATIONS } from "@/lib/constants/locations";
import type { EasternState } from "@/lib/types";
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
  { label: "Under ₦50k", min: 0, max: 49999 },
  { label: "₦50k–₦150k", min: 50000, max: 150000 },
  { label: "₦150k–₦500k", min: 150001, max: 500000 },
  { label: "₦500k–₦1M", min: 500001, max: 1000000 },
  { label: "₦1M–₦3M", min: 1000001, max: 3000000 },
  { label: "₦3M–₦10M", min: 3000001, max: 10000000 },
  { label: "Above ₦10M", min: 10000001, max: Infinity },
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
  state: EasternState | "All";
  city: string;
  area: string;
  condition: BrowseFilterCondition;
  priceIndex: number;
  locationSheetOpen?: boolean;
  onLocationSheetClose?: () => void;
  onLocationChange: (value: {
    state: EasternState | "All";
    city: string;
    area: string;
  }) => void;
  onConditionChange: (value: BrowseFilterCondition) => void;
  onPriceChange: (index: number) => void;
};

export function BrowseFilters({
  state,
  city,
  area,
  condition,
  priceIndex,
  locationSheetOpen,
  onLocationSheetClose,
  onLocationChange,
  onConditionChange,
  onPriceChange,
}: BrowseFiltersProps) {
  const [activeSheet, setActiveSheet] = useState<FilterSheet>(null);

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
      <div className="market-hscroll">
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
          <FilterPill
            label={conditionLabel}
            active={conditionActive}
            onClick={() => setActiveSheet("condition")}
          />
        </div>
      </div>

      <LocationFilterSheet
        open={activeSheet === "location"}
        onClose={closeLocationSheet}
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
      <ChevronDown size={14} className="shrink-0 opacity-70" aria-hidden />
    </button>
  );
}

function LocationFilterSheet({
  open,
  onClose,
  state,
  city,
  area,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  state: EasternState | "All";
  city: string;
  area: string;
  onApply: (value: {
    state: EasternState | "All";
    city: string;
    area: string;
  }) => void;
}) {
  const [step, setStep] = useState<LocationStep>("state");
  const [draftState, setDraftState] = useState<EasternState | "All">("All");
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
      EASTERN_NIGERIA_LOCATIONS.find((entry) => entry.state === draftState)?.cities ??
      []
    );
  }, [draftState]);

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
          {EASTERN_NIGERIA_LOCATIONS.map((entry) => (
            <BottomSheetOption
              key={entry.state}
              label={entry.state}
              selected={draftState === entry.state}
              onSelect={() => {
                setDraftState(entry.state);
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
              key={cityEntry.name}
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
              key={areaOption}
              label={areaOption}
              selected={area === areaOption}
              onSelect={() =>
                onApply({
                  state: draftState,
                  city: draftCity,
                  area: areaOption,
                })
              }
            />
          ))}
        </>
      ) : null}
    </BottomSheet>
  );
}
