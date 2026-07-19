"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MapPin, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { LocationTreeState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export type LocationSelection = {
  state: string | "All";
  city: string;
  area: string;
};

type Step = "state" | "city" | "area";

type LocationExplorerModalProps = {
  open: boolean;
  onClose: () => void;
  locationTree: LocationTreeState[];
  value: LocationSelection;
  onApply: (value: LocationSelection) => void;
  title?: string;
};

export function LocationExplorerModal({
  open,
  onClose,
  locationTree,
  value,
  onApply,
  title = "Location",
}: LocationExplorerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("state");
  const [draftState, setDraftState] = useState<string | "All">("All");
  const [draftCity, setDraftCity] = useState("All");
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("state");
    setDraftState(value.state);
    setDraftCity(value.city);
    setQuery("");
  }, [open, value.state, value.city]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: 0 });
  }, [open, step, query]);

  const cities = useMemo(() => {
    if (draftState === "All") return [];
    return locationTree.find((entry) => entry.name === draftState)?.cities ?? [];
  }, [draftState, locationTree]);

  const areas = useMemo(() => {
    if (draftCity === "All") return [];
    return cities.find((entry) => entry.name === draftCity)?.areas ?? [];
  }, [cities, draftCity]);

  const filteredStates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locationTree;
    return locationTree.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [locationTree, query]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [cities, query]);

  const filteredAreas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [areas, query]);

  const headerTitle =
    step === "state" ? title : step === "city" ? String(draftState) : draftCity;

  function handleBack() {
    setQuery("");
    if (step === "area") {
      setStep("city");
      return;
    }
    if (step === "city") {
      setStep("state");
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="location-explorer" role="dialog" aria-modal="true" aria-label={title}>
      <header className="location-explorer-head">
        <button
          type="button"
          className="location-explorer-icon-btn"
          aria-label={step === "state" ? "Close" : "Back"}
          onClick={() => {
            if (step === "state") onClose();
            else handleBack();
          }}
        >
          {step === "state" ? <X size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="location-explorer-eyebrow">
            <MapPin size={12} className="inline" aria-hidden /> Select
          </p>
          <h2 className="location-explorer-title">{headerTitle}</h2>
        </div>
        <span className="size-8" aria-hidden />
      </header>

      <div className="location-explorer-search">
        <Search size={16} className="shrink-0 opacity-50" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            step === "state"
              ? "Search states…"
              : step === "city"
                ? "Search cities / LGAs…"
                : "Search areas…"
          }
          className="location-explorer-input"
        />
      </div>

      <div ref={listRef} className="location-explorer-list">
        {step === "state" ? (
          <>
            <button
              type="button"
              className={cn(
                "location-explorer-row",
                value.state === "All" && "is-active",
              )}
              onClick={() => onApply({ state: "All", city: "All", area: "All" })}
            >
              All locations
            </button>
            {filteredStates.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={cn(
                  "location-explorer-row",
                  draftState === entry.name && "is-active",
                )}
                onClick={() => {
                  setDraftState(entry.name);
                  setDraftCity("All");
                  setQuery("");
                  setStep("city");
                }}
              >
                {entry.name}
              </button>
            ))}
          </>
        ) : null}

        {step === "city" ? (
          <>
            <button
              type="button"
              className={cn(
                "location-explorer-row",
                value.state === draftState && value.city === "All" && "is-active",
              )}
              onClick={() =>
                onApply({ state: draftState, city: "All", area: "All" })
              }
            >
              All in {draftState}
            </button>
            {filteredCities.map((cityEntry) => (
              <button
                key={cityEntry.id}
                type="button"
                className={cn(
                  "location-explorer-row",
                  draftCity === cityEntry.name && "is-active",
                )}
                onClick={() => {
                  setDraftCity(cityEntry.name);
                  setQuery("");
                  if ((cityEntry.areas?.length ?? 0) === 0) {
                    onApply({
                      state: draftState,
                      city: cityEntry.name,
                      area: "All",
                    });
                    return;
                  }
                  setStep("area");
                }}
              >
                {cityEntry.name}
              </button>
            ))}
          </>
        ) : null}

        {step === "area" ? (
          <>
            <button
              type="button"
              className={cn(
                "location-explorer-row",
                value.state === draftState &&
                  value.city === draftCity &&
                  value.area === "All" &&
                  "is-active",
              )}
              onClick={() =>
                onApply({ state: draftState, city: draftCity, area: "All" })
              }
            >
              All in {draftCity}
            </button>
            {filteredAreas.map((areaOption) => (
              <button
                key={areaOption.id}
                type="button"
                className={cn(
                  "location-explorer-row",
                  value.area === areaOption.name && "is-active",
                )}
                onClick={() =>
                  onApply({
                    state: draftState,
                    city: draftCity,
                    area: areaOption.name,
                  })
                }
              >
                {areaOption.name}
              </button>
            ))}
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
