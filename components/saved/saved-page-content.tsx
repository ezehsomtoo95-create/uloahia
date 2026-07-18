"use client";

import Link from "next/link";
import { ListingCard } from "@/components/listings/listing-card";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { buildAuthHref } from "@/lib/utils/auth-redirect";

export function SavedPageContent() {
  const { items, isReady, isAuthenticated } = useSavedListings();

  return (
    <main className="market-saved pt-3">
      <header className="market-page-head">
        <h1 className="market-page-title">Saved</h1>
        <p className="market-page-sub">Items you want to revisit</p>
      </header>

      <div className="saved-page-scroll market-saved-body">
        {!isReady ? (
          <div className="market-product-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <SavedCardSkeleton key={index} />
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
        ) : items.length > 0 ? (
          <div className="market-product-grid">
            {items.map(({ listing }) => (
              <ListingCard key={listing.id} listing={listing} />
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
    </main>
  );
}

function SavedCardSkeleton() {
  return (
    <div className="listing-card">
      <div className="product-media product-media--flush-top listing-card-photo skeleton" />
      <div className="listing-card-body space-y-2 p-2.5">
        <div className="h-4 w-20 rounded skeleton" />
        <div className="h-3.5 w-full rounded skeleton" />
        <div className="h-3 w-2/3 rounded skeleton" />
      </div>
    </div>
  );
}
