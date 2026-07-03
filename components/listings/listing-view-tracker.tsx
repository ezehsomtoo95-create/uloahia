"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { recordListingView } from "@/app/actions/listing-views";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateGuestVisitorId } from "@/lib/utils/visitor-id";

export function ListingViewTracker({ listingId }: { listingId: string }) {
  const router = useRouter();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) {
      return;
    }

    tracked.current = true;

    async function trackView() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const visitorId = user?.id ?? getOrCreateGuestVisitorId();
      if (!visitorId) {
        return;
      }

      const result = await recordListingView(listingId, visitorId, !user);
      if (result.recorded) {
        router.refresh();
      }
    }

    void trackView();
  }, [listingId, router]);

  return null;
}
