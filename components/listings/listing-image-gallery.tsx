"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { ListingDetailImage } from "@/components/listings/listing-detail-image";
import { cn } from "@/lib/utils/cn";

type ListingImageGalleryProps = {
  images: string[];
  title: string;
};

function GalleryFallback() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
      <ImageOff size={28} strokeWidth={1.5} />
      <p className="text-[12px] font-medium">No photos available</p>
    </div>
  );
}

export function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const galleryImages = images.filter(Boolean);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  const visibleImages = galleryImages.filter((url) => !failedUrls.has(url));
  const hasMultipleImages = visibleImages.length > 1;
  const canScrollPrev = selectedIndex > 0;
  const canScrollNext = selectedIndex < visibleImages.length - 1;

  const syncIndexFromScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || visibleImages.length === 0) return;

    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    setSelectedIndex(nearest);
  }, [visibleImages.length]);

  useEffect(() => {
    setFailedUrls(new Set());
    setSelectedIndex(0);
    slideRefs.current = [];
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [images.join("|")]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    syncIndexFromScroll();

    function onScroll() {
      syncIndexFromScroll();
    }

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScroll);
    };
  }, [syncIndexFromScroll, visibleImages.length]);

  function markImageFailed(url: string) {
    setFailedUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  function goToIndex(index: number) {
    const slide = slideRefs.current[index];
    if (!slide) return;
    slide.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setSelectedIndex(index);
  }

  function scrollPrev() {
    if (!canScrollPrev) return;
    goToIndex(selectedIndex - 1);
  }

  function scrollNext() {
    if (!canScrollNext) return;
    goToIndex(selectedIndex + 1);
  }

  return (
    <section className="listing-image-gallery market-pdp-photos mx-auto w-full max-w-full">
      <div className="listing-gallery-stage">
        <div
          ref={scrollerRef}
          className="listing-gallery-viewport listing-gallery-scroller aspect-square w-full"
          aria-label={`${title} photos`}
        >
          {visibleImages.length > 0 ? (
            visibleImages.map((url, index) => (
              <div
                key={`${url}-${index}`}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className="listing-gallery-slide relative overflow-hidden bg-[color-mix(in_srgb,var(--muted)_22%,var(--background))]"
              >
                <ListingDetailImage
                  src={url}
                  alt={`${title} photo ${index + 1}`}
                  variant="hero"
                  priority={index === 0}
                  // Only decode full-res for the active slide and its neighbors.
                  // Far slides keep layout with a cheap thumb until scrolled near.
                  forceThumb={Math.abs(index - selectedIndex) > 1}
                  onError={() => markImageFailed(url)}
                />
              </div>
            ))
          ) : (
            <div className="listing-gallery-slide relative">
              <GalleryFallback />
            </div>
          )}
        </div>

        <div className="listing-gallery-veil pointer-events-none" aria-hidden />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={!canScrollPrev}
              onClick={scrollPrev}
              className={cn(
                "listing-gallery-nav listing-gallery-nav--prev",
                !canScrollPrev && "is-disabled",
              )}
            >
              <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={!canScrollNext}
              onClick={scrollNext}
              className={cn(
                "listing-gallery-nav listing-gallery-nav--next",
                !canScrollNext && "is-disabled",
              )}
            >
              <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <span className="market-pdp-photo-count">
              {selectedIndex + 1}/{visibleImages.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="listing-gallery-thumbs market-pdp-thumbs" role="tablist" aria-label="Photos">
          {visibleImages.map((url, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={`${url}-thumb-${index}`}
                type="button"
                role="tab"
                aria-label={`View photo ${index + 1}`}
                aria-selected={active}
                onClick={() => goToIndex(index)}
                className={cn(
                  "listing-gallery-thumb market-pdp-thumb",
                  active && "is-active",
                )}
              >
                <ListingDetailImage
                  src={url}
                  alt={`${title} photo ${index + 1}`}
                  variant="thumb"
                  onError={() => markImageFailed(url)}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
