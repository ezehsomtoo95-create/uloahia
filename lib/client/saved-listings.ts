"use client";

import { createClient } from "@/lib/supabase/client";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";
import { toggleAuthenticatedSavedListing } from "@/lib/client/saved-listings-auth";
import type { Listing } from "@/lib/types";

export async function toggleSavedListingForViewer(listing: Listing) {
  const supabase = createClient();
  const session = await waitForInitialAuthSession(supabase);

  if (!session?.user) {
    return { requiresAuth: true as const };
  }

  return toggleAuthenticatedSavedListing(listing.id, session);
}
