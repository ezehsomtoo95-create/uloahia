"use client";

import Link from "next/link";
import { BrowseListingRow } from "@/components/listings/browse-listing-row";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { buildAuthHref } from "@/lib/utils/auth-redirect";

export function SavedPageContent() {
  const { items, isReady, isAuthenticated } = useSavedListings();

  return (
    <main className="saved-page pt-3">
      <h1 className="type-page-title shrink-0">Saved</h1>
      {!isReady ? (
        <section className="market-feed">
          {Array.from({ length: 4 }).map((_, index) => (
            <SavedRowSkeleton key={index} />
          ))}
        </section>
      ) : !isAuthenticated ? (
        <div className="touch-card p-4">
          <h2 className="text-[16px] font-medium">Sign in to view saved</h2>
          <Link
            href={buildAuthHref("login", "/saved")}
            className="type-btn mt-3 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[13px] text-primary-foreground"
          >
            Login
          </Link>
        </div>
      ) : items.length > 0 ? (
        <section className="market-feed">
          {items.map(({ listing }) => (
            <BrowseListingRow key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <div className="touch-card p-4">
          <h2 className="text-[16px] font-medium">Nothing saved</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Save items to view later
          </p>
          <Link
            href="/browse"
            className="type-btn mt-3 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[13px] text-primary-foreground"
          >
            Browse listings
          </Link>
        </div>
      )}
    </main>
  );
}

function SavedRowSkeleton() {
  return (
    <div className="market-listing-card">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="market-listing-photo skeleton" />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded-full skeleton" />
            <div className="h-3.5 w-full rounded-full skeleton" />
            <div className="h-3 w-3/4 rounded-full skeleton" />
            <div className="h-3 w-1/2 rounded-full skeleton" />
          </div>
          <div className="mt-2 h-2.5 w-14 rounded-full skeleton" />
        </div>
      </div>
    </div>
  );
}
