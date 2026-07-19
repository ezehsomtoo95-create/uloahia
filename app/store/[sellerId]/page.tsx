import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { ListingCatalog } from "@/components/market/listing-catalog";
import { StorefrontAvatar } from "@/components/store/storefront-avatar";
import {
  getPublicSellerById,
  getSellerActiveListings,
} from "@/lib/data/sellers";
import { formatViews } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const seller = await getPublicSellerById(sellerId);
  const name = seller?.fullName || seller?.username || "Seller";
  return {
    title: `${name} · Store`,
    description: `Browse active listings from ${name} on AhiaUlo.`,
  };
}

export default async function SellerStorePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const seller = await getPublicSellerById(sellerId);

  if (!seller) {
    notFound();
  }

  const listings = await getSellerActiveListings(seller.id);
  const locationLabel = [seller.city, seller.state].filter(Boolean).join(", ");
  const displayName = seller.fullName || seller.username || "Seller";

  return (
    <main className="market-shop pb-4 pt-3">
      <header className="market-shop-header">
        <div className="market-shop-identity">
          <StorefrontAvatar src={seller.avatarUrl} displayName={displayName} />
          <div className="market-shop-copy">
            <p className="market-shop-eyebrow">Seller storefront</p>
            <h1 className="market-shop-name">{displayName}</h1>
            {seller.username ? (
              <p className="market-shop-handle">@{seller.username}</p>
            ) : null}
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
            <strong>{formatViews(seller.totalViews)}</strong>
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
