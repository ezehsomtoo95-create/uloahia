"use client";

import Link from "next/link";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export function SavedPageContent() {
  const { items, isReady, isAuthenticated } = useSavedListings();
  const [viewMode, setViewMode] = useListingViewMode("grid");
  const listings = items.map((item) => item.listing);

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
              {!isReady
                ? "Loading…"
                : !isAuthenticated
                  ? "Sign in to sync bookmarks"
                  : listings.length === 0
                    ? "Nothing saved yet"
                    : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
            </p>
          </div>
          {isReady && isAuthenticated && listings.length > 0 ? (
            <div className="market-block-actions">
              <ViewToggle value={viewMode} onToggle={setViewMode} aria-label="Saved layout" />
            </div>
          ) : null}
        </div>

        <div className="market-saved-body">
          {!isReady ? (
            <div
              className={cn(
                viewMode === "grid" ? "market-product-grid" : "market-product-list",
              )}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <ListingCardSkeleton key={index} variant={viewMode} />
              ))}
            </div>
          ) : !isAuthenticated ? (
            <div className="market-empty market-empty--center">
              <p className="market-empty-title">Sign in to see saved items</p>
              <p className="market-empty-copy">
                Bookmark listings while you browse and pick up where you left off.
              </p>
              <div className="market-empty-actions">
                <Link
                  href={buildAuthHref("login", "/saved")}
                  className="market-empty-cta"
                >
                  Log in or Sign up
                </Link>
                <Link href="/browse" className="market-empty-cta market-empty-cta--ghost">
                  Browse listings
                </Link>
              </div>
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
