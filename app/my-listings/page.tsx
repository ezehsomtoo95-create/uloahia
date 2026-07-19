import Link from "next/link";
import { BadgeCheck, Eye } from "lucide-react";
import { deleteListing, relistListing } from "@/app/my-listings/actions";
import { actionButtonClass } from "@/components/my-listings/action-button-styles";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { MarkSoldButton } from "@/components/my-listings/mark-sold-button";
import { BRAND_NAME } from "@/lib/constants/brand";
import { getCurrentUser, getMyListings } from "@/lib/data/listings";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";
import { redirect } from "next/navigation";

export default async function MyListingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/my-listings");
  }

  const listings = await getMyListings();

  return (
    <main className="account-page space-y-3 pb-6">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="market-page-title">My Listings</h1>
          <p className="market-page-sub">
            Manage items you&apos;ve posted on {BRAND_NAME}.
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
        >
          New
        </Link>
      </section>

      <section className="flex flex-col gap-1.5">
        {listings.length > 0 ? (
          listings.map((listing) => (
            <MyListingManageRow key={listing.id} listing={listing} />
          ))
        ) : (
          <div className="market-empty market-empty--center">
            <p className="market-empty-title">No listings yet</p>
            <p className="market-empty-copy">
              Post your first item and start selling on {BRAND_NAME}.
            </p>
            <Link href="/sell" className="market-empty-cta">
              Post an item
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function MyListingManageRow({ listing }: { listing: Listing }) {
  const isSold = listing.status === "sold";

  return (
    <article
      className={cn(
        "my-listing-row",
        isSold && "my-listing-row--sold",
      )}
    >
      <Link href={`/listing/${listing.id}`} className="my-listing-row-main">
        <div className="product-media product-media--xs my-listing-row-photo">
          {listing.imageUrl ? (
            <ListingListImage
              src={listing.imageUrl}
              alt={listing.title}
              variant="row"
              className="product-media-img"
            />
          ) : (
            <div className="listing-card-photo-empty">
              <span>No photo</span>
            </div>
          )}
        </div>

        <div className="my-listing-row-copy">
          <div className="my-listing-row-top">
            <p className="my-listing-row-price">{formatNaira(listing.price)}</p>
            <StatusBadge status={listing.status} />
          </div>
          <h2 className="my-listing-row-title">{listing.title}</h2>
          <div className="my-listing-row-meta">
            <span className="truncate">
              {listing.area}, {listing.city}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Eye size={10} strokeWidth={2} aria-hidden />
              {formatViews(listing.views)}
            </span>
            {listing.verified ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-primary">
                  <BadgeCheck size={10} strokeWidth={2.2} aria-hidden />
                  Verified
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="my-listing-row-actions">
        {isSold || listing.status === "rejected" ? (
          <ActionForm action={relistListing} listingId={listing.id} label="Relist" />
        ) : null}
        <Link
          href={`/sell?edit=${listing.id}`}
          className={actionButtonClass("default", "compact")}
        >
          Edit
        </Link>
        <MarkSoldButton listingId={listing.id} isSold={isSold} compact />
        <ActionForm action={deleteListing} listingId={listing.id} label="Delete" danger />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "approved"
      ? "Live"
      : status === "pending"
        ? "Pending"
        : status === "sold"
          ? "Sold"
          : status;

  return (
    <span
      className={cn(
        "my-listing-row-status",
        status === "approved" && "is-live",
        status === "pending" && "is-pending",
        status === "sold" && "is-sold",
        status === "rejected" && "is-rejected",
      )}
    >
      {label}
    </span>
  );
}

function ActionForm({
  action,
  listingId,
  label,
  danger,
}: {
  action: (formData: FormData) => Promise<void>;
  listingId: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action} className="contents">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        className={actionButtonClass(danger ? "danger" : "default", "compact")}
      >
        {label}
      </button>
    </form>
  );
}
