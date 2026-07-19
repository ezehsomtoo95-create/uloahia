"use client";

import Link from "next/link";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export function SavedPageContent({
  isAuthenticated: initialAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { items, isReady, isAuthenticated: clientAuthenticated } = useSavedListings();
  const [viewMode, setViewMode] = useListingViewMode("grid");
  const listings = items.map((item) => item.listing);

  // Prefer server auth for first paint; fall back to client once hydrated.
  const isAuthenticated = isReady ? clientAuthenticated : initialAuthenticated;
  const showGuestPrompt = !isAuthenticated;
  const showLoading = isAuthenticated && !isReady;
  const loginHref = buildAuthHref("login", "/saved");

  if (showGuestPrompt) {
    return (
      <main className="market-saved pt-3">
        <header className="market-page-head">
          <h1 className="market-page-title">Saved</h1>
          <p className="market-page-sub">Items you want to revisit</p>
        </header>

        <section className="market-block">
          <div className="market-empty market-empty--center rounded-[16px] border border-border bg-surface px-5 py-10">
            <p className="market-empty-title">Sign in to see your saved items</p>
            <p className="market-empty-copy">
              Bookmark listings while you browse, then come back here anytime to pick up
              where you left off.
            </p>
            <div className="market-empty-actions">
              <Link href={loginHref} className="market-empty-cta">
                Sign in
              </Link>
              <Link href="/browse" className="market-empty-cta market-empty-cta--ghost">
                Browse listings
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="market-saved pt-3">
      <header className="market-page-head">
        <h1 className="market-page-title">Saved</h1>
        <p className="market-page-sub">Items you want to revisit</p>
      </header>

      <section className="market-block">
        <div className="market-block-head">
          <div>
            <h2 className="market-block-title">Your saves</h2>
            <p className="market-block-sub">
              {showLoading
                ? "Loading…"
                : listings.length === 0
                  ? "Nothing saved yet"
                  : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
            </p>
          </div>
          {!showLoading && listings.length > 0 ? (
            <div className="market-block-actions">
              <ViewToggle value={viewMode} onToggle={setViewMode} aria-label="Saved layout" />
            </div>
          ) : null}
        </div>

        <div className="market-saved-body">
          {showLoading ? (
            <div
              className={cn(
                viewMode === "grid" ? "market-product-grid" : "market-product-list",
              )}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <ListingCardSkeleton key={index} variant={viewMode} />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div
              className={cn(
                viewMode === "grid" ? "market-product-grid" : "market-product-list",
              )}
            >
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant={viewMode} />
              ))}
            </div>
          ) : (
            <div className="market-empty">
              <p className="market-empty-title">Nothing saved yet</p>
              <p className="market-empty-copy">
                Tap the bookmark on any listing to keep it here.
              </p>
              <Link href="/browse" className="market-empty-cta">
                Browse listings
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
