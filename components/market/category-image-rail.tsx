"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  CATEGORIES_INDEX_HREF,
  categoryOverviewHref,
} from "@/lib/categories/discovery";
import { getCategoryImage } from "@/lib/constants/category-imagery";
import { useDragScroll } from "@/lib/hooks/use-drag-scroll";
import { useHorizontalWheelScroll } from "@/lib/hooks/use-horizontal-wheel-scroll";
import { cn } from "@/lib/utils/cn";

export type CategoryVisualItem = {
  slug: string;
  name: string;
  icon?: string | null;
};

/**
 * Native horizontal category carousel.
 * overflow-x scroll + mouse drag + wheel remap. No arrows, dots, or snap.
 */
export function CategoryImageRail({
  categories,
  active = "All",
  onSelect,
  showAll = true,
  showBrowseAllLink = true,
  size = "md",
  allHref = CATEGORIES_INDEX_HREF,
  categoryHref = categoryOverviewHref,
}: {
  categories: CategoryVisualItem[];
  active?: string | "All";
  onSelect?: (slug: string | "All") => void;
  showAll?: boolean;
  showBrowseAllLink?: boolean;
  size?: "sm" | "md" | "lg";
  allHref?: string;
  categoryHref?: (slug: string) => string;
}) {
  const interactive = Boolean(onSelect);
  const scrollRef = useRef<HTMLDivElement>(null);

  useDragScroll(scrollRef);
  useHorizontalWheelScroll(scrollRef);

  return (
    <div
      className={cn(
        "category-rail",
        size === "lg" && "category-rail--lg",
        size === "sm" && "category-rail--sm",
      )}
    >
      <div
        ref={scrollRef}
        className="category-rail-scroll"
        role="region"
        aria-label="Marketplace categories"
      >
        <div className="category-rail-track">
          {showAll ? (
            interactive ? (
              <button
                type="button"
                className={cn("category-tile", active === "All" && "is-active")}
                onClick={() => onSelect?.("All")}
              >
                <span className="category-tile-media category-tile-media--all">
                  <span className="category-tile-all-mark">All</span>
                </span>
                <span className="category-tile-label">All</span>
              </button>
            ) : (
              <Link href={allHref} className="category-tile" draggable={false}>
                <span className="category-tile-media category-tile-media--all">
                  <span className="category-tile-all-mark">All</span>
                </span>
                <span className="category-tile-label">All</span>
              </Link>
            )
          ) : null}

          {categories.map((category) => {
            const image = getCategoryImage(category.slug, category.icon);
            const content = (
              <>
                <span className="category-tile-media">
                  <span className="category-tile-photo">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="120px"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="category-tile-fallback">
                        {category.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="category-tile-label">{category.name}</span>
              </>
            );

            if (interactive) {
              return (
                <button
                  key={category.slug}
                  type="button"
                  className={cn(
                    "category-tile",
                    active === category.slug && "is-active",
                  )}
                  onClick={() => onSelect?.(category.slug)}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={category.slug}
                href={categoryHref(category.slug)}
                className="category-tile"
                draggable={false}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {showBrowseAllLink ? (
        <Link href={CATEGORIES_INDEX_HREF} className="category-rail-more">
          Browse all categories →
        </Link>
      ) : null}
    </div>
  );
}
