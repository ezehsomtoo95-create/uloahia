"use client";

import { cn } from "@/lib/utils/cn";

type CategoryChipItem = {
  slug: string;
  name: string;
  icon?: string | null;
};

function BrowseCategoryChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "browse-category-chip snap-start",
        active && "browse-category-chip-active",
      )}
    >
      {children}
    </button>
  );
}

export function BrowseCategoryRow({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryChipItem[];
  active: string | "All";
  onSelect: (slug: string | "All") => void;
}) {
  return (
    <div className="native-scroll -mx-3 w-[calc(100%+1.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain scroll-smooth">
      <div className="flex w-max snap-x snap-mandatory flex-nowrap items-center gap-1.5 px-3 pb-0.5">
        <BrowseCategoryChip
          active={active === "All"}
          onClick={() => onSelect("All")}
        >
          All
        </BrowseCategoryChip>
        {categories.map((category) => (
          <BrowseCategoryChip
            key={category.slug}
            active={active === category.slug}
            onClick={() => onSelect(category.slug)}
          >
            {category.name}
          </BrowseCategoryChip>
        ))}
      </div>
    </div>
  );
}
