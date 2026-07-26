import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { ListingCatalog } from "@/components/market/listing-catalog";
import { StorefrontAvatar } from "@/components/store/storefront-avatar";
import {
  getPublicSellerByUsername,
  getSellerActiveListings,
} from "@/lib/data/sellers";
import { formatViews } from "@/lib/utils/format";
import { formatSellerDisplayName } from "@/lib/utils/seller-display";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const seller = await getPublicSellerByUsername(username);
  const name = formatSellerDisplayName(seller);
  return {
    title: seller ? `${name} · Shop` : "Shop",
    description: seller
      ? `Browse active listings from ${name} on AhiaUlo.`
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
  const displayName = formatSellerDisplayName(seller);

  return (
    <main className="market-shop pb-4 pt-3">
      <header className="market-shop-header">
        <div className="market-shop-identity">
          <StorefrontAvatar src={seller.avatarUrl} displayName={displayName || "Seller"} />
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

      <ListingCatalog
        className="market-shop-listings"
        listings={listings}
        title="Catalog"
        subtitle={
          listings.length === 0
            ? "Nothing listed right now"
            : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`
        }
        emptyTitle="No active listings"
        emptyCopy="Check back later — this seller may post again soon."
        emptyAction={
          <Link href="/browse" className="market-empty-cta">
            Browse marketplace
          </Link>
        }
      />
    </main>
  );
}
