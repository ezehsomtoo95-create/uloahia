"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_CONTAINER_SELECTORS =
  ".admin-desktop-main, .admin-desktop-scroll, .listing-detail-main";

export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    document.querySelectorAll(SCROLL_CONTAINER_SELECTORS).forEach((element) => {
      element.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}
