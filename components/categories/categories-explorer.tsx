"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { categoryMarketplaceHref } from "@/lib/categories/discovery";
import { getCategoryImage } from "@/lib/constants/category-imagery";
import type { CategoryWithCount } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function formatCount(count: number) {
  return new Intl.NumberFormat("en-NG").format(count);
}

function normalizeSlug(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function findParentIdBySlug(
  parents: CategoryWithCount[],
  slug?: string | null,
): string | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return parents.find((parent) => parent.slug === normalized)?.id ?? null;
}

function subscribeDesktop(onStoreChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function useIsDesktopLayout() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

type CategoriesExplorerProps = {
  parents: CategoryWithCount[];
  /** Server-resolved id from `?expand=` — opens accordion / selects panel on first paint. */
  defaultExpandedId?: string | null;
  /** Server-provided expand slug. */
  initialExpandSlug?: string | null;
};

export function CategoriesExplorer(props: CategoriesExplorerProps) {
  return (
    <Suspense
      fallback={
        <CategoriesExplorerView
          {...props}
          expandSlug={props.initialExpandSlug ?? null}
        />
      }
    >
      <CategoriesExplorerWithSearchParams {...props} />
    </Suspense>
  );
}

function CategoriesExplorerWithSearchParams(props: CategoriesExplorerProps) {
  const searchParams = useSearchParams();
  const expandSlug =
    normalizeSlug(searchParams.get("expand")) ??
    normalizeSlug(searchParams.get("cat")) ??
    normalizeSlug(searchParams.get("category")) ??
    normalizeSlug(props.initialExpandSlug);

  return <CategoriesExplorerView {...props} expandSlug={expandSlug} />;
}

function CategoriesExplorerView({
  parents,
  defaultExpandedId = null,
  expandSlug,
}: CategoriesExplorerProps & { expandSlug: string | null }) {
  const isDesktop = useIsDesktopLayout();
  const urlExpandedId =
    findParentIdBySlug(parents, expandSlug) ?? defaultExpandedId ?? null;

  const [selectedId, setSelectedId] = useState(
    () => urlExpandedId ?? parents[0]?.id ?? "",
  );
  const [expandedId, setExpandedId] = useState<string | null>(() => urlExpandedId);

  const contentRef = useRef<HTMLElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const skipInitialDesktopScroll = useRef(true);

  // Deep-link only: jump once when URL expand changes — avoid erratic scroll on manual toggles.
  const deepLinkScrolledFor = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!urlExpandedId) return;
    setExpandedId(urlExpandedId);
    setSelectedId(urlExpandedId);

    if (deepLinkScrolledFor.current === urlExpandedId) return;
    deepLinkScrolledFor.current = urlExpandedId;

    const element = document.getElementById(`category-${urlExpandedId}`);
    const scroller = listScrollRef.current;
    if (element && scroller) {
      const rootRect = scroller.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();
      scroller.scrollTop += elRect.top - rootRect.top - 8;
    } else {
      element?.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [urlExpandedId]);

  useEffect(() => {
    if (skipInitialDesktopScroll.current) {
      skipInitialDesktopScroll.current = false;
      return;
    }
    if (expandSlug) return;
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedId, expandSlug]);

  const selected = useMemo(
    () => parents.find((parent) => parent.id === selectedId) ?? parents[0],
    [parents, selectedId],
  );

  function selectCategory(id: string) {
    setSelectedId(id);
    setExpandedId(id);
  }

  function handleAccordionToggle(id: string, currentlyOpen: boolean) {
    if (currentlyOpen) {
      setExpandedId(null);
      return;
    }
    selectCategory(id);
  }

  if (parents.length === 0) {
    return (
      <div className="touch-card p-4 text-[13px] text-muted">
        Categories will appear here once they are published in admin.
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="categories-explorer-desktop grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <aside className="categories-parent-rail categories-panel-scroll rounded-[14px] border border-border bg-surface p-2">
          <nav className="flex flex-col gap-0.5" aria-label="Parent categories">
            {parents.map((category) => {
              const active = category.id === selected?.id;
              const image = getCategoryImage(category.slug, category.icon);
              return (
                <div
                  key={category.id}
                  id={`category-${category.id}`}
                  data-category-slug={category.slug}
                  className="category-deep-link-target"
                >
                  <button
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] px-2 py-2 text-left",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-background",
                    )}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[10px] border border-border bg-background">
                      {image ? (
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="40px"
                          loading="lazy"
                          decoding="async"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-[12px] font-semibold">
                          {category.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium leading-tight">
                        {category.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {formatCount(category.listingCount)} listings
                      </span>
                    </span>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "shrink-0 opacity-50",
                        active && "text-primary opacity-80",
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        <section
          ref={contentRef}
          className="categories-panel-scroll overflow-hidden rounded-[14px] border border-border bg-surface"
        >
          {selected ? (
            <>
              <div className="relative h-36 overflow-hidden border-b border-border">
                {getCategoryImage(selected.slug, selected.icon) ? (
                  <Image
                    src={getCategoryImage(selected.slug, selected.icon)!}
                    alt=""
                    fill
                    sizes="640px"
                    priority
                    decoding="async"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="size-full bg-background" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-tight text-white">
                      {selected.name}
                    </h2>
                    <p className="mt-0.5 text-[12px] text-white/80">
                      {formatCount(selected.listingCount)} active listings
                    </p>
                  </div>
                  <Link
                    href={categoryMarketplaceHref(selected.slug)}
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-foreground"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="p-4">
                {selected.children.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                    {selected.children.map((child) => (
                      <Link
                        key={child.id}
                        href={categoryMarketplaceHref(child.slug)}
                        className="rounded-[12px] border border-border/80 bg-background/70 px-3 py-2.5"
                      >
                        <span className="block text-[13px] font-medium text-foreground">
                          {child.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {formatCount(child.listingCount)} listings
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">
                    No subcategories yet.{" "}
                    <Link
                      href={categoryMarketplaceHref(selected.slug)}
                      className="text-primary"
                    >
                      Browse {selected.name}
                    </Link>
                  </p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div ref={listScrollRef} className="categories-overview-scroll">
      <div className="categories-accordion-list">
        {parents.map((category) => (
          <CategoryAccordionItem
            key={category.id}
            category={category}
            isOpen={expandedId === category.id}
            onToggle={() =>
              handleAccordionToggle(category.id, expandedId === category.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

function CategoryAccordionItem({
  category,
  isOpen,
  onToggle,
}: {
  category: CategoryWithCount;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const image = getCategoryImage(category.slug, category.icon);

  return (
    <div
      id={`category-${category.id}`}
      data-category-slug={category.slug}
      className="category-deep-link-target overflow-hidden rounded-[14px] border border-border bg-surface"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-2.5 text-left"
        aria-expanded={isOpen}
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-[12px] border border-border bg-background">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="56px"
              loading="lazy"
              decoding="async"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="grid size-full place-items-center text-[14px] font-semibold text-primary">
              {category.name.slice(0, 1)}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-foreground">
            {category.name}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted">
            {formatCount(category.listingCount)} listings
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted", isOpen && "rotate-180 text-primary")}
        />
      </button>

      {isOpen ? (
        <div className="border-t border-border px-2 py-2">
          <Link
            href={categoryMarketplaceHref(category.slug)}
            className="mb-1 flex items-center justify-between rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-primary"
          >
            View all in {category.name}
            <ChevronRight size={14} />
          </Link>
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={categoryMarketplaceHref(child.slug)}
              className="flex items-center justify-between rounded-[10px] px-2.5 py-2.5 text-[13px] text-foreground"
            >
              <span>{child.name}</span>
              <span className="text-[11px] text-muted">
                {formatCount(child.listingCount)}
              </span>
            </Link>
          ))}
          {category.children.length === 0 ? (
            <p className="px-2.5 py-2 text-[12px] text-muted">No subcategories yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
