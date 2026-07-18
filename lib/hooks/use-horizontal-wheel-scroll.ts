"use client";

import { useEffect, type RefObject } from "react";

/**
 * Natural horizontal scrolling for category strips:
 * - vertical wheel → horizontal when hovering the strip
 * - trackpad horizontal gestures pass through
 * - Shift + wheel as a fallback
 *
 * Non-passive listener so preventDefault works on desktop browsers.
 */
export function useHorizontalWheelScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    function onWheel(event: WheelEvent) {
      if (!container || container.scrollWidth <= container.clientWidth) return;

      let delta = 0;

      if (event.shiftKey) {
        // Shift + wheel: use whichever axis the browser reports.
        delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        // Native trackpad horizontal — let the browser handle it.
        return;
      } else if (event.deltaY !== 0) {
        delta = event.deltaY;
      } else {
        return;
      }

      // Normalize line/page deltas to pixel-like steps.
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= container.clientWidth;

      const maxScroll = container.scrollWidth - container.clientWidth;
      const next = Math.min(maxScroll, Math.max(0, container.scrollLeft + delta));
      if (next === container.scrollLeft) return;

      event.preventDefault();
      container.scrollLeft = next;
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [ref]);
}
