"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { recordListingView } from "@/app/actions/listing-views";
import { resetScrollToTop } from "@/components/layout/scroll-to-top";
import { createClient } from "@/lib/supabase/client";
import {
  hasViewedListingCookie,
  markListingViewedCookie,
} from "@/lib/utils/listing-view-cookie";
import { getOrCreateVisitorId } from "@/lib/utils/visitor-id";

export function ListingViewTracker({
  listingId,
  sellerId,
}: {
  listingId: string;
  sellerId?: string | null;
}) {
  const router = useRouter();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || hasViewedListingCookie(listingId)) {
      return;
    }

    tracked.current = true;

    // `trackView()` is async (Supabase auth lookup + server action). The RAF
    // used to re-pin the freshly-opened listing to the top must NEVER fire
    // after this component unmounts — e.g. if the user taps a product and
    // immediately hits Back. If it fired on /browse it would yank the user
    // back to the top and destroy the exact scroll position Back must
    // restore. `active` + a closable `rafId` guarantee the RAF (and the
    // router.refresh) only ever run while this listing is still mounted.
    let active = true;
    let rafId: number | undefined;

    async function trackView() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (sellerId && user?.id === sellerId) {
        markListingViewedCookie(listingId);
        return;
      }

      const visitorId = user?.id ?? getOrCreateVisitorId();
      if (!visitorId) {
        return;
      }

      const result = await recordListingView(listingId, visitorId, !user);
      if (!result.ok) {
        tracked.current = false;
        return;
      }

      markListingViewedCookie(listingId);

      if (!active) {
        return;
      }

      if (result.incremented) {
        // router.refresh() revalidates the route to pick up the incremented
        // view count. On mobile browsers the async re-render that follows can
        // re-activate the browser's native scroll restoration, making the
        // freshly-opened listing visibly scroll from the previous browse
        // position. Re-pin to position 0 with instant (non-smooth) behavior:
        //   1. Immediately — covers the synchronous re-render
        //   2. requestAnimationFrame — covers the next paint frame
        router.refresh();
        resetScrollToTop();
        rafId = requestAnimationFrame(() => {
          if (!active) {
            return;
          }
          resetScrollToTop();
        });
      }
    }

    void trackView();

    return () => {
      active = false;
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [listingId, router, sellerId]);

  return null;
}
