"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";
import { SAVED_LISTINGS_CHANGED_EVENT } from "@/lib/client/saved-listings-events";
import {
  loadSavedListings,
  type SavedListingItem,
} from "@/lib/client/load-saved-listings";
import { toggleSavedListingForViewer } from "@/lib/client/saved-listings";
import { fetchAuthenticatedSavedListingIds } from "@/lib/client/saved-listings-auth";
import type { Listing } from "@/lib/types";

type ToggleSaveResult =
  | { saved: boolean }
  | { requiresAuth: true }
  | { failed: true; saved: boolean };

type SavedListingsContextValue = {
  items: SavedListingItem[];
  count: number;
  isReady: boolean;
  isAuthenticated: boolean;
  isSaved: (listingId: string) => boolean;
  toggleSave: (listing: Listing) => Promise<ToggleSaveResult>;
  refresh: () => Promise<void>;
};

const SavedListingsContext = createContext<SavedListingsContextValue | null>(null);

const LEGACY_GUEST_KEYS = ["savedListings", "uloahia_saved_listings"];

function clearLegacyGuestSavedStorage() {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of LEGACY_GUEST_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function SavedListingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<SavedListingItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const session = await waitForInitialAuthSession(supabase);
    const authed = Boolean(session?.user);

    setIsAuthenticated(authed);

    if (!authed) {
      setItems([]);
      setSavedIds(new Set());
      setIsReady(true);
      return;
    }

    const { savedRows } = await fetchAuthenticatedSavedListingIds(session!.user.id);
    setSavedIds(new Set(savedRows.map((row) => row.listing_id)));

    const nextItems = await loadSavedListings();
    setItems(nextItems);
    setIsReady(true);
  }, []);

  useEffect(() => {
    clearLegacyGuestSavedStorage();

    const supabase = createClient();
    let cancelled = false;

    async function hydrate() {
      if (cancelled) {
        return;
      }

      await refresh();
    }

    void hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        void hydrate();
      }
    });

    function handleSavedListingsChanged() {
      void hydrate();
    }

    window.addEventListener(SAVED_LISTINGS_CHANGED_EVENT, handleSavedListingsChanged);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(
        SAVED_LISTINGS_CHANGED_EVENT,
        handleSavedListingsChanged,
      );
    };
  }, [refresh]);

  const isSaved = useCallback(
    (listingId: string) => savedIds.has(listingId),
    [savedIds],
  );

  const toggleSave = useCallback(
    async (listing: Listing): Promise<ToggleSaveResult> => {
      const supabase = createClient();
      const session = await waitForInitialAuthSession(supabase);

      if (!session?.user) {
        return { requiresAuth: true };
      }

      const wasSaved = savedIds.has(listing.id);
      const result = await toggleSavedListingForViewer(listing);

      if ("requiresAuth" in result && result.requiresAuth) {
        return { requiresAuth: true };
      }

      if ("error" in result && result.error) {
        console.error("[saved] toggleSave failed", {
          listingId: listing.id,
          error: result.error,
          supabaseError:
            "supabaseError" in result ? result.supabaseError : undefined,
        });
        return { failed: true, saved: wasSaved };
      }

      if ("saved" in result) {
        setSavedIds((current) => {
          const next = new Set(current);
          if (result.saved) {
            next.add(listing.id);
          } else {
            next.delete(listing.id);
          }
          return next;
        });
      }

      await refresh();

      const persistedSaved = "saved" in result ? Boolean(result.saved) : wasSaved;
      return { saved: persistedSaved };
    },
    [savedIds, refresh],
  );

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isReady,
      isAuthenticated,
      isSaved,
      toggleSave,
      refresh,
    }),
    [items, isReady, isAuthenticated, isSaved, toggleSave, refresh],
  );

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings() {
  const context = useContext(SavedListingsContext);
  if (!context) {
    throw new Error("useSavedListings must be used within SavedListingsProvider");
  }
  return context;
}
