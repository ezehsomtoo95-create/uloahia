"use client";

import Link from "next/link";
import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { categoryOverviewHref } from "@/lib/categories/discovery";
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  CookingPot,
  Cpu,
  Dumbbell,
  Factory,
  Gamepad2,
  Handshake,
  HeartPulse,
  Home,
  Laptop,
  Music,
  Palette,
  PawPrint,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Tags,
  Tractor,
  Tv,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { CategoryImageRail } from "@/components/market/category-image-rail";
import { Chip, ChipRow, BrowseScrollRow } from "@/components/ui/chip";
import { useHorizontalWheelScroll } from "@/lib/hooks/use-horizontal-wheel-scroll";
import { cn } from "@/lib/utils/cn";

export type CategoryChipItem = {
  slug: string;
  name: string;
  icon?: string | null;
};

export function CategoryRow({
  categories,
  active = "All",
  onSelect,
  showAll = false,
  showBrowseAllLink = false,
  variant = "market",
}: {
  categories: CategoryChipItem[];
  active?: string | "All";
  onSelect?: (slug: string | "All") => void;
  showAll?: boolean;
  showBrowseAllLink?: boolean;
  variant?: "default" | "browse" | "market";
}) {
  const interactive = Boolean(onSelect);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  });

  useHorizontalWheelScroll(scrollRef);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || event.button !== 0) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      dragged: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    const distance = event.clientX - dragState.current.startX;
    if (!dragState.current.dragged && Math.abs(distance) > 8) {
      dragState.current.dragged = true;
      container.setPointerCapture(event.pointerId);
      container.classList.add("is-dragging");
    }

    if (dragState.current.dragged) {
      event.preventDefault();
      container.scrollLeft = dragState.current.startScrollLeft - distance;
    }
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    container.classList.remove("is-dragging");
    dragState.current.pointerId = -1;
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (dragState.current.dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragState.current.dragged = false;
    }
  }

  if (variant === "market") {
    return (
      <div>
        <div
          ref={scrollRef}
          className="market-hscroll"
          role="region"
          aria-label="Marketplace categories"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onClickCapture={handleClickCapture}
        >
          <div className="market-hscroll-inner">
            {interactive && showAll ? (
              <MarketCategoryChip
                active={active === "All"}
                onClick={() => onSelect?.("All")}
              >
                <CategoryChipContent name="All" icon={null} />
              </MarketCategoryChip>
            ) : null}
            {categories.map((category) =>
              interactive ? (
                <MarketCategoryChip
                  key={category.slug}
                  active={active === category.slug}
                  onClick={() => onSelect?.(category.slug)}
                >
                  <CategoryChipContent
                    name={category.name}
                    icon={category.icon}
                  />
                </MarketCategoryChip>
              ) : (
                <Link
                  key={category.slug}
                  href={categoryOverviewHref(category.slug)}
                  className="market-category-chip snap-start"
                >
                  <CategoryChipContent
                    name={category.name}
                    icon={category.icon}
                  />
                </Link>
              ),
            )}
          </div>
        </div>
        {showBrowseAllLink ? (
          <Link
            href="/categories"
            className="type-link mt-2.5 inline-flex text-[12px] text-primary sm:text-[13px]"
          >
            Browse all categories →
          </Link>
        ) : null}
      </div>
    );
  }

  const chipSize = variant === "browse" ? "category" : "default";
  const Row = variant === "browse" ? BrowseScrollRow : ChipRow;

  return (
    <Row>
      {interactive && showAll ? (
        <Chip active={active === "All"} size={chipSize} onClick={() => onSelect?.("All")}>
          All
        </Chip>
      ) : null}
      {categories.map((category) =>
        interactive ? (
          <Chip
            key={category.slug}
            size={chipSize}
            active={active === category.slug}
            onClick={() => onSelect?.(category.slug)}
          >
            {category.name}
          </Chip>
        ) : (
          <Chip
            key={category.slug}
            size={chipSize}
            href={categoryOverviewHref(category.slug)}
          >
            {category.name}
          </Chip>
        ),
      )}
    </Row>
  );
}

const CATEGORY_ICON_REGISTRY: Record<string, LucideIcon> = {
  baby: Baby,
  book: BookOpen,
  "book-open": BookOpen,
  briefcase: BriefcaseBusiness,
  car: Car,
  "cooking-pot": CookingPot,
  cpu: Cpu,
  dumbbell: Dumbbell,
  factory: Factory,
  "gamepad-2": Gamepad2,
  handshake: Handshake,
  "heart-pulse": HeartPulse,
  home: Home,
  laptop: Laptop,
  music: Music,
  palette: Palette,
  "paw-print": PawPrint,
  shirt: Shirt,
  smartphone: Smartphone,
  sofa: Sofa,
  sparkles: Sparkles,
  tractor: Tractor,
  tv: Tv,
  utensils: Utensils,
  wrench: Wrench,
};

function CategoryChipContent({
  name,
  icon,
}: {
  name: string;
  icon?: string | null;
}) {
  const Icon = (icon && CATEGORY_ICON_REGISTRY[icon]) || Tags;

  return (
    <>
      <span className="market-category-chip-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.85} />
      </span>
      <span className="market-category-chip-label">{name}</span>
    </>
  );
}

/** Interactive category row for Browse — image-forward marketplace tiles. */
export function BrowseCategoryRow({
  categories,
  active = "All",
  onSelect,
}: {
  categories: CategoryChipItem[];
  active?: string | "All";
  onSelect: (slug: string | "All") => void;
}) {
  return (
    <CategoryImageRail
      categories={categories}
      active={active}
      showAll
      showBrowseAllLink
      onSelect={onSelect}
    />
  );
}

function MarketCategoryChip({
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
      className={cn("market-category-chip cursor-pointer snap-start", active && "is-active")}
    >
      {children}
    </button>
  );
}
