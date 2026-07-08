"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { recordListingView } from "@/app/actions/listing-views";
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

      if (result.incremented) {
        router.refresh();
      }
    }

    void trackView();
  }, [listingId, router, sellerId]);

  return null;
}
