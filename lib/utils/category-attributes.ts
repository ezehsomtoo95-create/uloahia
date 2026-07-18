import type { CategoryAttributeField } from "@/lib/types";

export function listingMatchesAttributeFilters(
  attributes: Record<string, string | number | boolean | null> | undefined,
  filters: Record<string, string>,
): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === "All") continue;
    const raw = attributes?.[key];
    if (raw == null) return false;

    if (value === "Yes" || value === "No") {
      const truthy = raw === true || String(raw).toLowerCase() === "true" || String(raw).toLowerCase() === "yes";
      if (value === "Yes" ? !truthy : truthy) return false;
      continue;
    }

    if (String(raw).toLowerCase() !== value.toLowerCase()) {
      return false;
    }
  }
  return true;
}

/** Prefer richer select options when merging schemas by field key. */
export function mergeAttributeFieldsByKey(
  fields: CategoryAttributeField[],
): CategoryAttributeField[] {
  const byKey = new Map<string, CategoryAttributeField>();

  for (const field of fields) {
    if (!field.isActive) continue;
    const existing = byKey.get(field.fieldKey);
    if (!existing) {
      byKey.set(field.fieldKey, field);
      continue;
    }
    if (field.options.length > existing.options.length) {
      byKey.set(field.fieldKey, field);
    }
  }

  return [...byKey.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}
