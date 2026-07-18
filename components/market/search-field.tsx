"use client";

import { Search, X } from "lucide-react";
import { SEARCH_PLACEHOLDER } from "@/lib/constants/brand";

export function SearchField({
  value,
  onChange,
  onClear,
  placeholder = SEARCH_PLACEHOLDER,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} className="shrink-0 text-text-secondary" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="search-field-input"
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="shrink-0 text-text-secondary"
        >
          <X size={14} />
        </button>
      ) : null}
    </label>
  );
}
