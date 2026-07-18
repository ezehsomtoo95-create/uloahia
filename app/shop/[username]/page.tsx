import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Store } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import {
  getPublicSellerByUsername,
  getSellerActiveListings,
} from "@/lib/data/sellers";
import { formatViews } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const seller = await getPublicSellerByUsername(username);
  return {
    title: seller ? `${seller.fullName || seller.username} · Shop` : "Shop",
    description: seller
      ? `Browse active listings from ${seller.fullName || seller.username} on AhiaUlo.`
      : "Seller shop on AhiaUlo",
  };
}

export default async function SellerShopPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const seller = await getPublicSellerByUsername(username);

  if (!seller) {
    notFound();
  }

  const listings = await getSellerActiveListings(seller.id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locationLabel = [seller.city, seller.state].filter(Boolean).join(", ");
  const displayName = seller.fullName || seller.username;

  return (
    <main className="market-shop pb-4 pt-3">
      <header className="market-shop-header">
        <div className="market-shop-identity">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-neutral-100 dark:bg-neutral-800"
            aria-hidden
          >
            {seller.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store size={28} strokeWidth={1.6} />
            )}
          </div>
          <div className="market-shop-copy">
            <p className="market-shop-eyebrow">Seller shop</p>
            <h1 className="market-shop-name">{displayName}</h1>
            <p className="market-shop-handle">@{seller.username}</p>
            {locationLabel ? (
              <p className="market-shop-location">
                <MapPin size={13} strokeWidth={2} />
                {locationLabel}
              </p>
            ) : null}
          </div>
        </div>

        <p className="market-shop-stats">
          <span>
            <strong>{seller.activeListingCount}</strong> active
          </span>
          <span aria-hidden>·</span>
          <span>
            <strong>{formatViews(seller.totalViews)}</strong> views
          </span>
          <span aria-hidden>·</span>
          <span>Member since {seller.memberSinceLabel}</span>
        </p>

        <div className="market-shop-trust">
          {seller.phoneVerified ? (
            <span>
              <BadgeCheck size={12} strokeWidth={2.2} />
              Phone verified
            </span>
          ) : null}
          <span>
            <BadgeCheck size={12} strokeWidth={2.2} />
            Email account
          </span>
        </div>

        <p className="market-shop-hint">
          Contact this seller from any listing using Chat with Seller
          {user ? " or WhatsApp when available" : ""}.
          {listings[0] ? (
            <>
              {" "}
              <Link href={`/listing/${listings[0].id}`}>Open a listing</Link>
            </>
          ) : null}
        </p>
      </header>

      <section className="market-shop-listings">
        <div className="market-block-head">
          <div>
            <h2 className="market-block-title">For sale</h2>
            <p className="market-block-sub">
              {listings.length === 0
                ? "Nothing listed right now"
                : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
            </p>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="market-empty">
            <p className="market-empty-title">No active listings</p>
            <p className="market-empty-copy">
              Check back later — this seller may post again soon.
            </p>
            <Link href="/browse" className="market-empty-cta">
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="market-product-grid">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
