"use client";

import { useEffect, type RefObject } from "react";

type AutoScrollRailOptions = {
  /** When false the hook stays completely inert. */
  enabled?: boolean;
  /** Drift speed in pixels per second (subtle by default). */
  speedPxPerSecond?: number;
  /** Idle wait after the last user interaction before gently resuming. */
  resumeDelayMs?: number;
  /** Small pause at the far end before easing back to the start. */
  loopPauseMs?: number;
};

// Scroll events fired by our own scrollLeft writes arrive shortly after the
// frame that wrote them; anything beyond this grace window counts as user
// scrolling (trackpad, touch flick/momentum, scrollbar, keyboard).
const PROGRAMMATIC_GRACE_MS = 160;
const RETURN_DURATION_MS = 1000;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Slow continuous auto-scroll for horizontal carousels.
 *
 * - Drifts forward slowly, pauses briefly at the end, then eases smoothly
 *   back to the beginning and keeps looping.
 * - Pauses instantly on touch, mouse drag, swipe, trackpad/wheel, scrollbar
 *   or keyboard scrolling, and gently resumes after a few idle seconds,
 *   continuing from wherever the user left the rail.
 * - Inert when the element is off-screen, when the tab is hidden, and for
 *   users who prefer reduced motion.
 *
 * Implementation note: scroll offsets are accumulated here as a float and
 * written to the element rounded to whole pixels. Browsers quantize
 * Element.scrollLeft to integer pixels, so writing tiny per-frame deltas
 * directly onto the element (e.g. += 0.37px at 22px/s and 60fps) would be
 * truncated every frame and the rail would never visibly move.
 *
 * Deliberately preserves native scrolling: this hook never calls
 * preventDefault, so the existing drag/momentum and wheel-remap hooks keep
 * working unchanged.
 */
export function useAutoScrollRail(
  ref: RefObject<HTMLElement | null>,
  {
    enabled = true,
    speedPxPerSecond = 22,
    resumeDelayMs = 3000,
    loopPauseMs = 900,
  }: AutoScrollRailOptions = {},
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const el: HTMLElement = node;

    const reduceMotion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let rafId = 0;
    let lastFrameTs = 0;
    let visible = true;

    // Timestamps are all on the performance.now() clock.
    let interactedAt = -Infinity; // last user interaction
    let programmaticUntil = 0; // ignore scroll events caused by our writes
    let endReachedAt = 0; // moment the rail hit the end
    let returnFrom = -1; // easing-back-to-start animation state
    let returnStartedAt = 0;

    // Float mirror of the rail position. Sub-pixel speed cannot be written
    // straight into scrollLeft (integer-snapped by browsers), so the fraction
    // lives here between frames.
    let posX = Number.NaN;
    let lastWrittenX = -1;
    // Set when the user moved the rail themselves; the next active frame
    // re-syncs posX from the element so drifting resumes where they left it.
    let pendingSync = true;

    function markInteraction() {
      interactedAt = performance.now();
      pendingSync = true;
      // Cancel the end-of-rail pause and any return animation so the next
      // resume simply drifts forward from wherever the user left it.
      endReachedAt = 0;
      returnFrom = -1;
    }

    function writeTo(position: number) {
      const next = Math.max(0, Math.round(position));
      if (next !== lastWrittenX) {
        el.scrollLeft = next;
        lastWrittenX = next;
      }
    }

    function onPointerDown() {
      markInteraction();
    }

    function onTouchStart() {
      markInteraction();
    }

    function onWheel() {
      markInteraction();
    }

    function onKeyDown() {
      markInteraction();
    }

    function onScroll(event: Event) {
      if (event.timeStamp > programmaticUntil) {
        markInteraction();
      }
    }

    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);

      // First frame: establish the clock baseline.
      if (lastFrameTs === 0) {
        lastFrameTs = ts;
        return;
      }
      // Clamp dt so background-tab jumps never cause sudden leaps.
      const dt = Math.min(Math.max(ts - lastFrameTs, 0), 64);
      lastFrameTs = ts;

      if (document.hidden || !visible) return;
      if (reduceMotion?.matches) return;
      if (ts - interactedAt < resumeDelayMs) return;

      const max = el.scrollWidth - el.clientWidth;
      if (max <= 8) return;

      // Re-sync after user scrolling so we always continue from their spot.
      if (!Number.isFinite(posX) || pendingSync) {
        posX = el.scrollLeft;
        pendingSync = false;
        lastWrittenX = Math.round(posX);
      }

      if (returnFrom >= 0) {
        // Ease smoothly back to the beginning, then continue drifting.
        const t = Math.min((ts - returnStartedAt) / RETURN_DURATION_MS, 1);
        const eased = easeInOutCubic(t);
        posX = returnFrom * (1 - eased);
        writeTo(posX);
        programmaticUntil = ts + PROGRAMMATIC_GRACE_MS;
        if (t >= 1) {
          returnFrom = -1;
          endReachedAt = 0;
        }
        return;
      }

      if (endReachedAt > 0) {
        if (ts - endReachedAt < loopPauseMs) return;
        returnFrom = Math.max(posX, max);
        returnStartedAt = ts;
        return;
      }

      posX = Math.min(posX + (speedPxPerSecond * dt) / 1000, max);
      writeTo(posX);
      programmaticUntil = ts + PROGRAMMATIC_GRACE_MS;

      if (posX >= max - 0.5) {
        posX = max;
        writeTo(max);
        endReachedAt = ts;
      }
    }

    function onVisibilityChange() {
      // Reset the frame clock so the pause never turns into a jump.
      lastFrameTs = 0;
    }

    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            lastFrameTs = 0;
          })
        : null;

    observer?.observe(el);
    document.addEventListener("visibilitychange", onVisibilityChange);
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("keydown", onKeyDown, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref, enabled, speedPxPerSecond, resumeDelayMs, loopPauseMs]);
}