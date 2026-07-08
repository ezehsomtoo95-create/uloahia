"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_CONTAINER_SELECTORS =
  ".saved-page-scroll, .admin-desktop-main, .admin-desktop-scroll, .listing-detail-main, .marketplace-main";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);

    document.querySelectorAll(SCROLL_CONTAINER_SELECTORS).forEach((element) => {
      element.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}
