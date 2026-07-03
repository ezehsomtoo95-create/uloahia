"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { ListingDetailImage } from "@/components/listings/listing-detail-image";
import { cn } from "@/lib/utils/cn";

type ListingImageGalleryProps = {
  images: string[];
  title: string;
};

const SWIPE_THRESHOLD_PX = 48;

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
  }, [images.join("|")]);

  const visibleImages = galleryImages.filter((url) => !failedUrls.has(url));
  const safeActiveIndex = Math.min(activeIndex, Math.max(visibleImages.length - 1, 0));
  const heroImage = visibleImages[safeActiveIndex] ?? null;
  const hasMultipleImages = visibleImages.length > 1;

  function markImageFailed(url: string) {
    setFailedUrls((current) => {
      if (current.has(url)) {
        return current;
      }

      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  function showPreviousImage() {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex(
      (current) => (current - 1 + visibleImages.length) % visibleImages.length,
    );
  }

  function showNextImage() {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((current) => (current + 1) % visibleImages.length);
  }

  function handleHeroTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasMultipleImages) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleHeroTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || !hasMultipleImages) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX > 0) {
      showPreviousImage();
    } else {
      showNextImage();
    }
  }

  return (
    <section className="listing-image-gallery w-full max-w-full">
      <div className="listing-gallery-main">
        {hasMultipleImages ? (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={showPreviousImage}
            className={cn(
              "listing-gallery-nav listing-gallery-nav--prev hidden lg:grid",
            )}
          >
            <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}

        <div
          className="listing-gallery-hero relative aspect-square w-full max-w-full rounded-[28px] bg-[#151515]"
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
        >
          {heroImage ? (
            <ListingDetailImage
              src={heroImage}
              alt={title}
              variant="hero"
              priority={safeActiveIndex === 0}
              className="rounded-[28px]"
              onError={() => markImageFailed(heroImage)}
            />
          ) : (
            <GalleryFallback />
          )}
        </div>

        {hasMultipleImages ? (
          <button
            type="button"
            aria-label="Next photo"
            onClick={showNextImage}
            className={cn(
              "listing-gallery-nav listing-gallery-nav--next hidden lg:grid",
            )}
          >
            <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="listing-gallery-thumbs native-scroll flex touch-pan-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain">
          {visibleImages.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              aria-label={`View photo ${index + 1}`}
              aria-pressed={index === safeActiveIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "listing-gallery-thumb relative size-[72px] shrink-0 overflow-hidden rounded-2xl border-2 bg-[#151515] transition duration-app",
                index === safeActiveIndex
                  ? "border-primary"
                  : "border-border opacity-80 hover:opacity-100",
              )}
            >
              <ListingDetailImage
                src={url}
                alt={`${title} photo ${index + 1}`}
                variant="thumb"
                onError={() => markImageFailed(url)}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
