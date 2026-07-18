"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
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
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: false,
  });

  const visibleImages = galleryImages.filter((url) => !failedUrls.has(url));
  const hasMultipleImages = visibleImages.length > 1;

  const syncCarouselState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    setFailedUrls(new Set());
    setSelectedIndex(0);
    emblaApi?.scrollTo(0, true);
  }, [images.join("|"), emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    syncCarouselState();
    emblaApi.on("select", syncCarouselState);
    emblaApi.on("reInit", syncCarouselState);
    return () => {
      emblaApi.off("select", syncCarouselState);
      emblaApi.off("reInit", syncCarouselState);
    };
  }, [emblaApi, syncCarouselState]);

  function markImageFailed(url: string) {
    setFailedUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  function goToIndex(index: number) {
    emblaApi?.scrollTo(index);
  }

  return (
    <section className="listing-image-gallery market-pdp-photos mx-auto w-full max-w-full">
      <div className="listing-gallery-stage">
        <div className="listing-gallery-viewport aspect-square w-full overflow-hidden" ref={emblaRef}>
          <div className="listing-gallery-track flex h-full">
            {visibleImages.length > 0 ? (
              visibleImages.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="listing-gallery-slide relative min-w-0 flex-[0_0_100%] overflow-hidden bg-[color-mix(in_srgb,var(--muted)_22%,var(--background))]"
                >
                  <ListingDetailImage
                    src={url}
                    alt={`${title} photo ${index + 1}`}
                    variant="hero"
                    priority={index === 0}
                    onError={() => markImageFailed(url)}
                  />
                </div>
              ))
            ) : (
              <div className="listing-gallery-slide relative min-w-0 flex-[0_0_100%]">
                <GalleryFallback />
              </div>
            )}
          </div>
        </div>

        <div className="listing-gallery-veil pointer-events-none" aria-hidden />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={!canScrollPrev}
              onClick={() => emblaApi?.scrollPrev()}
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
              onClick={() => emblaApi?.scrollNext()}
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
