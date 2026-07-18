"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NESTED_SCROLL_CONTAINER_SELECTORS = [
  ".marketplace-content-scroll",
  ".saved-page-scroll",
  ".admin-desktop-main",
  ".admin-desktop-scroll",
  ".admin-listing-view-panel-body",
].join(", ");

function resetScrollPosition() {
  const desktopContent = document.querySelector(".marketplace-content-scroll");
  const useDesktopScroll =
    desktopContent instanceof HTMLElement &&
    window.matchMedia("(min-width: 1024px)").matches;

  if (useDesktopScroll) {
    desktopContent.scrollTop = 0;
  } else {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  document.querySelectorAll(NESTED_SCROLL_CONTAINER_SELECTORS).forEach((element) => {
    if (element instanceof HTMLElement) {
      element.scrollTop = 0;
    }
  });
}

function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    // Keep scroll position when deep-linking into a category section.
    const isCategoryDeepLink =
      pathname === "/categories" &&
      Boolean(
        searchParams.get("expand") ??
          searchParams.get("cat") ??
          searchParams.get("category"),
      );
    if (isCategoryDeepLink) {
      return;
    }

    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        resetScrollPosition();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pathname, search]);

  return null;
}

export function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopOnRouteChange />
    </Suspense>
  );
}
