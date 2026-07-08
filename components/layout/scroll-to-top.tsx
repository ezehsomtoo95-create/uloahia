"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NESTED_SCROLL_CONTAINER_SELECTORS = [
  ".saved-page-scroll",
  ".admin-desktop-main",
  ".admin-desktop-scroll",
  ".admin-listing-view-panel-body",
].join(", ");

function resetScrollPosition() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

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
