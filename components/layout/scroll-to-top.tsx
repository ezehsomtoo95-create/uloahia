"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NESTED_SCROLL_CONTAINER_SELECTORS = [
  ".saved-page-scroll",
  ".admin-desktop-main",
  ".admin-desktop-scroll",
  ".admin-listing-view-panel-body",
].join(", ");

const SCROLL_STORAGE_KEY = "ahiaulo:scroll-position";

/**
 * The root cause of "listing detail opens then auto-scrolls down" is the
 * browser's default `history.scrollRestoration = "auto"`. On iOS Safari a
 * freshly pushed SPA entry inherits the previous entry's scroll offset and
 * re-applies it AFTER the new page mounts — undoing any post-paint reset.
 *
 * The proper fix is to take over history scroll restoration entirely:
 *   - "manual" stops the browser from ever restoring/stealing scroll.
 *   - A fresh route (e.g. tapping a listing) is opened at the exact top.
 *   - A back/forward (popstate) navigation restores the user's saved position.
 */
function disableNativeScrollRestoration() {
  if (
    typeof window !== "undefined" &&
    "scrollRestoration" in window.history
  ) {
    window.history.scrollRestoration = "manual";
  }
}

// Run as early as possible (before React hydrates/effects) so the browser
// never gets a chance to restore scroll onto a pushed route.
if (typeof window !== "undefined") {
  disableNativeScrollRestoration();
  // One listener for the app's lifetime: `popstate` fires BEFORE the router
  // re-renders, so the restore payload is captured even if this component is
  // not currently mounted (Suspense can unmount/remount it while the router
  // resolves the traversed segment — which previously lost a component-level
  // listener and made Back get mis-treated as a fresh route, resetting to 0).
  window.addEventListener("popstate", () => {
    const key = getRouteKey(
      location.pathname,
      location.search.replace(/^\?/, ""),
    );
    pendingRestore = { key, top: readSavedScrollPosition(key) };
  });
}

function findDesktopScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".marketplace-content-scroll");
}

function getActiveScroller(): HTMLElement | "window" {
  const scroller = findDesktopScroller();
  if (scroller && window.matchMedia("(min-width: 1024px)").matches) {
    return scroller;
  }
  return "window";
}

function getActiveScrollTop(): number {
  const scroller = getActiveScroller();
  return scroller === "window" ? window.scrollY : scroller.scrollTop;
}

function setActiveScrollTop(value: number) {
  applyScrollInstantly(() => {
    const scroller = getActiveScroller();
    if (scroller === "window") {
      window.scrollTo(0, value);
      document.documentElement.scrollTop = value;
      document.body.scrollTop = value;
      return;
    }
    scroller.scrollTop = value;
  });
}

function resetScrollPosition() {
  applyScrollInstantly(() => {
    const scroller = getActiveScroller();
    if (scroller === "window") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } else {
      scroller.scrollTop = 0;
    }

    document
      .querySelectorAll(NESTED_SCROLL_CONTAINER_SELECTORS)
      .forEach((element) => {
        if (element instanceof HTMLElement) {
          element.scrollTop = 0;
        }
      });
  });
}

function getRouteKey(pathname: string, search: string): string {
  return `${pathname}${search ? `?${search}` : ""}`;
}

/**
 * `html { scroll-behavior: smooth }` (globals.css) makes every programmatic
 * window scroll a visible ~300ms animation on mobile, which reads as
 * "the page automatically scrolls after opening". Route-driven resets and
 * back/forward restores must be instant, so pin scroll-behavior to auto
 * around each programmatic scroll (the same approach Next.js uses
 * internally for its own route scrolls). No timeouts involved.
 */
function applyScrollInstantly(scroll: () => void) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  try {
    scroll();
  } finally {
    if (previous) {
      root.style.scrollBehavior = previous;
    } else {
      root.style.removeProperty("scroll-behavior");
    }
  }
}

function saveScrollPosition(key: string, scrollTop: number) {
  try {
    if (typeof scrollTop !== "number" || !Number.isFinite(scrollTop) || scrollTop <= 0) {
      return;
    }
    const all = JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "{}");
    all[key] = scrollTop;
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage/JSON unavailable — restore is best-effort.
  }
}

function readSavedScrollPosition(key: string): number {
  try {
    const all = JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? "{}");
    const value = all[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : 0;
  } catch {
    return 0;
  }
}

/**
 * The pending back/forward restore, captured the instant `popstate` fires.
 * Module scope (not component state) so it cannot be lost when the component
 * unmounts/remounts during the router's segment resolution.
 */
let pendingRestore: { key: string; top: number } | null = null;

// Module scope (not component state) so these values survive remounts that
// happen when router.refresh() / Suspense suspend the ScrollToTop boundary.
// A component-level useRef would reset on every remount, incorrectly treating
// a post-refresh remount as a "first run" and skipping the scroll reset.
let isFirstRun = true;
let previousPath: { pathname: string; search: string } | null = null;

/**
 * Exported utility: force the active scroll container back to position 0
 * with instant (non-smooth) behavior. Used by ListingViewTracker to undo
 * any scroll restoration that router.refresh() can trigger on mobile.
 */
export function resetScrollToTop(): void {
  resetScrollPosition();
}

function ScrollToTopOnRouteChange() {
  // Opt out of React Compiler memoization: this component intentionally reads
  // and clears the module-scope `pendingRestore` that the module-level
  // `popstate` listener writes. `reactCompiler: true` treats that module-scope
  // binding as a constant (null) and dead-code-eliminates the back/forward
  // restore branch (and the popstate assignment), breaking Back navigation.
  "use no memo";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  // Keep a running record of where the user is on each route so Back can
    // return them to the exact place they left off.
  useEffect(() => {
    const persist = () => {
      // Save synchronously on every scroll event. The previous RAF-debounced
      // approach could miss the position if the user scrolled then immediately
      // navigated away (the RAF was torn down in the effect cleanup before
      // firing). sessionStorage writes are sub-millisecond, so a synchronous
      // save on every scroll guarantees sessionStorage always holds the latest
      // value when `popstate` fires on Back navigation.
      const top = getActiveScrollTop();
      if (top <= 0) {
        return;
      }
      saveScrollPosition(getRouteKey(pathname, search), top);
    };

    window.addEventListener("scroll", persist, { passive: true });
    const scroller = findDesktopScroller();
    scroller?.addEventListener("scroll", persist, { passive: true });
    window.addEventListener("resize", persist);

    return () => {
      window.removeEventListener("scroll", persist);
      scroller?.removeEventListener("scroll", persist);
      window.removeEventListener("resize", persist);
    };
  }, [pathname, search]);

  useLayoutEffect(() => {
    // Back/forward: `pendingRestore` was captured synchronously at popstate
    // time (module scope — survives Suspense remounts). It must be consumed
    // BEFORE every other branch, including the first-run skip, so a remount
    // during traversal can never swallow the restore.
    const restore = pendingRestore;
    pendingRestore = null;

    if (restore) {
      previousPath = { pathname, search };
      setActiveScrollTop(restore.top);

      // Programmatic apply whose own scroll events are flagged so the
      // late-growth watcher below never mistakes them for user scrolls.
      let applying = false;
      const applyRestore = () => {
        applying = true;
        setActiveScrollTop(restore.top);
        // Scroll events for this programmatic move fire in the scroll steps
        // of the next rendering frame (before rAF callbacks), so clearing
        // two rAFs later guarantees the flag covers them.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            applying = false;
          });
        });
      };

      // Re-assert the SAME restored position on the next paint. A competing
      // late restore (browser native scroll restoration or Next's own
      // popstate handling) can otherwise scroll the page back to 0 a frame
      // after ours applies — observed intermittently on desktop Chromium.
      // Re-applying the identical saved position is idempotent and can never
      // yank scroll anywhere but the exact position Back must restore.
      applyRestore();
      const rafReassert = requestAnimationFrame(applyRestore);

      // On a cold cache the restored page can be SHORTER than the saved
      // position while its images/fonts are still loading, and the browser
      // then clamps the scroll below the exact position (measured in a
      // fresh profile: Back to a near-bottom position restored 3430 instead
      // of 5588, and a filtered page restored 0 instead of 450). Until the
      // content grows tall enough, re-apply the saved position whenever the
      // page's boxes change size — event-driven via ResizeObserver, no
      // timers — and stand down the moment the exact position is reachable
      // or the user scrolls on their own. This can never move scroll
      // anywhere except to the exact saved position.
      let watching = true;
      const observers: ResizeObserver[] = [];
      const scrollTargets: Array<HTMLElement | Window> = [];
      const onWatchedScroll = () => {
        if (applying) return;
        stopWatching(); // The user moved — never fight their scroll.
      };
      const stopWatching = () => {
        if (!watching) return;
        watching = false;
        observers.forEach((observer) => observer.disconnect());
        scrollTargets.forEach((target) =>
          target.removeEventListener("scroll", onWatchedScroll),
        );
      };
      const maxScrollTop = () => {
        const scroller = getActiveScroller();
        if (scroller === "window") {
          return Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight,
          );
        }
        return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      };
      const maybeReassert = () => {
        if (!watching) return;
        if (maxScrollTop() < restore.top) return;
        applyRestore();
        stopWatching();
      };
      if (typeof ResizeObserver === "function") {
        const scroller = getActiveScroller();
        const growthTargets: Element[] =
          scroller === "window"
            ? [document.documentElement, document.body]
            : [scroller, ...Array.from(scroller.children)];
        growthTargets.forEach((target) => {
          const observer = new ResizeObserver(maybeReassert);
          observer.observe(target);
          observers.push(observer);
        });
      }
      const watchScroller = getActiveScroller();
      if (watchScroller === "window") {
        scrollTargets.push(window);
        window.addEventListener("scroll", onWatchedScroll, { passive: true });
      } else {
        scrollTargets.push(watchScroller);
        watchScroller.addEventListener("scroll", onWatchedScroll, {
          passive: true,
        });
      }
      maybeReassert();

      return () => {
        cancelAnimationFrame(rafReassert);
        stopWatching();
      };
    }

    // Keep scroll position when deep-linking into a category section.
    const isCategoryDeepLink =
      pathname === "/categories" &&
      Boolean(
        searchParams.get("expand") ??
          searchParams.get("cat") ??
          searchParams.get("category"),
      );
    if (isCategoryDeepLink) {
      previousPath = { pathname, search };
      return;
    }

    const pathChanged = !previousPath || previousPath.pathname !== pathname;
    const samePageUpdate = !pathChanged;

    // First paint of an app load: let the page's natural position stand.
    if (isFirstRun) {
      isFirstRun = false;
      previousPath = { pathname, search };
      return;
    }

    // Filter/search/sort URL updates on the SAME page must never yank scroll.
    if (samePageUpdate) {
      previousPath = { pathname, search };
      return;
    }

    // Fresh route change (e.g. opening a listing from the Browse grid):
    // the page must open at EXACTLY scroll position 0.
    previousPath = { pathname, search };
    resetScrollPosition();

    // Re-assert once the new page has painted. This is a single requestAnimationFrame
    // (no timeouts), and only serves a fresh route — it guarantees a late
    // layout/browser move cannot place a freshly-opened page anywhere but the top.
    const raf = requestAnimationFrame(() => {
      resetScrollPosition();
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname, search, searchParams]);

  return null;
}

export function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopOnRouteChange />
    </Suspense>
  );
}
