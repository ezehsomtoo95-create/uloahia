"use client";

import { useMemo, useState, useTransition } from "react";
import {
  adminUpsertArea,
  adminUpsertAttributeField,
  adminUpsertCategory,
  adminUpsertCity,
  adminUpsertCountry,
  adminUpsertState,
} from "@/app/admin/catalog-actions";
import type { CategoryAttributeField, CategoryTreeNode, LocationTreeState } from "@/lib/types";

type AdminCatalogPanelProps = {
  categoryTree: CategoryTreeNode[];
  attributeSchemas: CategoryAttributeField[];
  locationTree: LocationTreeState[];
  countries: Array<{ id: string; code: string; name: string; isActive: boolean; sortOrder: number }>;
};

function flattenLeaves(nodes: CategoryTreeNode[], path = ""): Array<{ id: string; label: string }> {
  const rows: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    const label = path ? `${path} / ${node.name}` : node.name;
    if (node.children.length === 0) {
      rows.push({ id: node.id, label });
    } else {
      rows.push(...flattenLeaves(node.children, label));
    }
  }
  return rows;
}

export function AdminCatalogPanel({
  categoryTree,
  attributeSchemas,
  locationTree,
  countries,
}: AdminCatalogPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState("");
  const [attrCategoryId, setAttrCategoryId] = useState("");
  const [attrLabel, setAttrLabel] = useState("");
  const [attrKey, setAttrKey] = useState("");
  const [attrType, setAttrType] = useState<"text" | "number" | "select" | "boolean">("text");
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [selectedStateId, setSelectedStateId] = useState(locationTree[0]?.id ?? "");
  const [selectedCityId, setSelectedCityId] = useState(locationTree[0]?.cities[0]?.id ?? "");
  const activeCountry = countries.find((country) => country.isActive) ?? countries[0];

  const leafOptions = useMemo(() => flattenLeaves(categoryTree), [categoryTree]);
  const selectedState = locationTree.find((state) => state.id === selectedStateId) ?? locationTree[0];
  const cities = selectedState?.cities ?? [];
  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? cities[0];

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? success : result.error ?? "Something went wrong");
    });
  }

  return (
    <section id="admin-categories" className="scroll-mt-4 space-y-4">
      <div>
        <h2 className="type-section-title">Catalog</h2>
        <p className="mt-1 text-[12px] text-muted">
          Manage categories, attribute schemas, and nationwide locations without code changes.
        </p>
        {message ? <p className="mt-2 text-[12px] text-primary">{message}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border bg-surface p-3 space-y-2">
          <h3 className="text-[13px] font-medium">Add category</h3>
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Category name"
            className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
          />
          <select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
          >
            <option value="">Top-level category</option>
            {categoryTree.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !categoryName.trim()}
            onClick={() =>
              run(
                () =>
                  adminUpsertCategory({
                    name: categoryName,
                    parentId: parentId || null,
                    isFeatured: !parentId,
                  }),
                "Category saved",
              )
            }
            className="type-btn h-9 rounded-full bg-primary px-4 text-[12px] text-primary-foreground"
          >
            Save category
          </button>
          <div className="max-h-48 overflow-y-auto text-[12px] text-muted">
            {categoryTree.map((category) => (
              <div key={category.id} className="py-1">
                <span className="font-medium text-foreground">{category.name}</span>
                {category.children.length > 0
                  ? ` · ${category.children.map((child) => child.name).join(", ")}`
                  : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-surface p-3 space-y-2">
          <h3 className="text-[13px] font-medium">Add attribute field</h3>
          <select
            value={attrCategoryId}
            onChange={(event) => setAttrCategoryId(event.target.value)}
            className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
          >
            <option value="">Select leaf category</option>
            {leafOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={attrLabel}
            onChange={(event) => {
              setAttrLabel(event.target.value);
              setAttrKey(event.target.value);
            }}
            placeholder="Field label (e.g. Brand)"
            className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
          />
          <select
            value={attrType}
            onChange={(event) =>
              setAttrType(event.target.value as "text" | "number" | "select" | "boolean")
            }
            className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="boolean">Boolean</option>
          </select>
          <button
            type="button"
            disabled={pending || !attrCategoryId || !attrLabel.trim()}
            onClick={() =>
              run(
                () =>
                  adminUpsertAttributeField({
                    categoryId: attrCategoryId,
                    fieldKey: attrKey,
                    label: attrLabel,
                    fieldType: attrType,
                    options: attrType === "select" ? ["Option 1", "Option 2"] : [],
                  }),
                "Attribute field saved",
              )
            }
            className="type-btn h-9 rounded-full bg-primary px-4 text-[12px] text-primary-foreground"
          >
            Save attribute
          </button>
          <p className="text-[11px] text-muted">
            {attributeSchemas.length} active attribute fields loaded.
          </p>
        </div>
      </div>

      <div
        id="admin-locations"
        className="rounded-[14px] border border-border bg-surface p-3 space-y-3 scroll-mt-4"
      >
        <h3 className="text-[13px] font-medium">Locations</h3>
        <p className="text-[12px] text-muted">
          Active country: {activeCountry?.name ?? "None"} ({activeCountry?.code ?? "—"})
        </p>
        <div className="grid gap-2 lg:grid-cols-3">
          <div className="space-y-2">
            <input
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
              placeholder="New state name"
              className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
            />
            <button
              type="button"
              disabled={pending || !activeCountry || !stateName.trim()}
              onClick={() =>
                run(
                  () =>
                    adminUpsertState({
                      countryId: activeCountry!.id,
                      name: stateName,
                    }),
                  "State saved",
                )
              }
              className="type-btn h-9 rounded-full border border-border px-4 text-[12px]"
            >
              Add state
            </button>
          </div>
          <div className="space-y-2">
            <select
              value={selectedState?.id ?? ""}
              onChange={(event) => {
                setSelectedStateId(event.target.value);
                const next = locationTree.find((state) => state.id === event.target.value);
                setSelectedCityId(next?.cities[0]?.id ?? "");
              }}
              className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
            >
              {locationTree.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
            <input
              value={cityName}
              onChange={(event) => setCityName(event.target.value)}
              placeholder="New city / LGA"
              className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
            />
            <button
              type="button"
              disabled={pending || !selectedState || !cityName.trim()}
              onClick={() =>
                run(
                  () =>
                    adminUpsertCity({
                      stateId: selectedState!.id,
                      name: cityName,
                    }),
                  "City saved",
                )
              }
              className="type-btn h-9 rounded-full border border-border px-4 text-[12px]"
            >
              Add city
            </button>
          </div>
          <div className="space-y-2">
            <select
              value={selectedCity?.id ?? ""}
              onChange={(event) => setSelectedCityId(event.target.value)}
              className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <input
              value={areaName}
              onChange={(event) => setAreaName(event.target.value)}
              placeholder="New area"
              className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px]"
            />
            <button
              type="button"
              disabled={pending || !selectedCity || !areaName.trim()}
              onClick={() =>
                run(
                  () =>
                    adminUpsertArea({
                      cityId: selectedCity!.id,
                      name: areaName,
                    }),
                  "Area saved",
                )
              }
              className="type-btn h-9 rounded-full border border-border px-4 text-[12px]"
            >
              Add area
            </button>
          </div>
        </div>
        <button
          type="button"
          disabled={pending || !activeCountry}
          onClick={() =>
            run(
              () =>
                adminUpsertCountry({
                  id: activeCountry!.id,
                  name: activeCountry!.name,
                  code: activeCountry!.code,
                  isActive: true,
                  sortOrder: activeCountry!.sortOrder,
                }),
              "Country settings saved",
            )
          }
          className="type-btn h-9 rounded-full bg-primary px-4 text-[12px] text-primary-foreground"
        >
          Keep Nigeria active
        </button>
      </div>
    </section>
  );
}
