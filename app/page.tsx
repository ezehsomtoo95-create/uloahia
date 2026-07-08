import Link from "next/link";
import { BadgeCheck, Search, ShieldCheck, Star } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { CategoryRow } from "@/components/market/category-row";
import { EmptyState } from "@/components/market/empty-state";
import { SectionHeader } from "@/components/market/section-header";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";

import { getApprovedListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const newListings = await getApprovedListings(24);

  return (
    <main className="marketplace-page--home space-y-3.5 pb-6 pt-3">

      <section className="space-y-3.5">
        <div className="max-w-[18rem] space-y-1">
          <h1 className="type-hero">Buy. Sell. Furnish your home.</h1>
          <p className="type-hero-sub">Ahịa ọma, ụlọ ọma.</p>
        </div>

        <Link href="/browse" className="search-field type-btn">
          <Search size={17} className="shrink-0 text-text-secondary" />
          <span className="text-text-secondary">Search sofas, fridges, beds, decor</span>
        </Link>
        <div className="grid grid-cols-3 gap-1.5">
          <TrustPill icon={<BadgeCheck size={13} />} label="Verified" />
          <TrustPill icon={<Star size={13} />} label="Featured" />
          <TrustPill icon={<ShieldCheck size={13} />} label="Reviewed" />
        </div>
      </section>

      <section>
        <SectionHeader title="Categories" href="/browse" actionLabel="View all" className="mb-2" />
        <CategoryRow />
      </section>

      <ListingSection title="New Listings" href="/browse" listings={newListings} />

      <footer className="type-meta pb-2 text-center leading-5">
        {BRAND_NAME} — {BRAND_TAGLINE.toLowerCase()}. Local buyers and sellers connect
        here, then continue on WhatsApp.
      </footer>

    </main>
  );
}

function TrustPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="trust-chip justify-center">
      <span className="text-primary">{icon}</span>
      {label}
    </div>  );
}

function ListingSection({
  title,
  href,
  listings,
}: {
  title: string;
  href: string;
  listings: Awaited<ReturnType<typeof getApprovedListings>>;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="type-section-title">{title}</h2>
        <Link href={href} className="type-link text-primary">
          See more
        </Link>
      </div>      {listings.length > 0 ? (
        <div className="marketplace-home-listings grid grid-cols-2 gap-2.5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No listings yet."
          description={`Be the first to post a household item on ${BRAND_NAME}.`}
        />      )}
    </section>
  );
}
