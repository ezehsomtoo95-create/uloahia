"use client";

import { useEffect, useState } from "react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

/**
 * Cold-start splash for platforms whose OS splash cannot carry artwork.
 *
 * WHY THIS EXISTS
 * ---------------
 * iOS shows `apple-touch-startup-image`, which is a full-screen image we
 * control, so the splash artwork can include the tagline. Android's SplashScreen
 * API (12+) accepts only a background colour and ONE centred icon - there is no
 * text slot, and the OS rejects anything that tries to fake one. The bare-icon
 * Android splash is the platform working as designed, not a bug.
 *
 * A Bubblewrap/TWA wrapper would allow a real native splash, but that changes
 * how the app is distributed and is out of scope.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is NOT a timed splash. There is no setTimeout, no minimum duration and no
 * artificial delay. It is bound to real work:
 *
 *   - it renders only on a COLD start (no sessionStorage flag), so a warm
 *     launch inside the same tab/session never shows it
 *   - it dismisses on the next frame after the app has mounted, i.e. the
 *     moment real content is available
 *
 * A deliberate splash delay is worse UX than a bare icon: it makes the app
 * feel slower for everyone to buy something they came to buy.
 *
 * KNOWN LIMIT (accepted)
 * ----------------------
 * The service worker precaches and calls skipWaiting + clientsClaim, so on a
 * warm start the cached page can be ready almost immediately and this will
 * flash for a frame or not appear at all. That is inherent to PWA caching, and
 * is why the component never forces a minimum visible time.
 */

const COLD_START_KEY = "ahiaulo:cold-start-seen";

export function ColdStartSplash() {
  // null = not yet decided, so nothing renders on the server or first paint.
  // Keeping the first paint clean avoids a flash-then-hydrate layout shift.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(COLD_START_KEY) === "1";
    } catch {
      // Private mode / storage disabled. Treat as warm rather than risk
      // flashing the splash at someone on every navigation.
      seen = true;
    }

    if (seen) {
      setVisible(false);
      return;
    }

    try {
      window.sessionStorage.setItem(COLD_START_KEY, "1");
    } catch {
      // Non-fatal: worst case the splash shows once more next session.
    }

    setVisible(true);

    // Dismiss as soon as the browser has had a chance to paint the real UI.
    // requestAnimationFrame + a second frame means the underlying content has
    // actually been composited before we cover it up again.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setLeaving(true));
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  if (visible !== true) {
    return null;
  }

  return (
    <div
      // aria-hidden: decorative. The page behind it is the real content, and
      // announcing a loading state that may be a single frame is noise.
      aria-hidden
      data-cold-start-splash=""
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "bg-background",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* The mark is the same artwork as the OS splash and the app icon, so
          the three read as one brand rather than three different logos. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon.png?v=2"
        alt=""
        width={96}
        height={96}
        className="h-24 w-24 object-contain"
      />
      <p className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">
        {BRAND_NAME}
      </p>
      <p className="mt-1 text-[13px] text-muted">{BRAND_TAGLINE}</p>
    </div>
  );
}
