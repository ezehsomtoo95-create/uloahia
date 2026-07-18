import Link from "next/link";
import {
  approveListing,
  deleteAdminListing,
  rejectListing,
} from "@/app/admin/actions";
import type { AdminListing } from "@/lib/data/admin-listings";
import { getCategoryName } from "@/lib/constants/categories";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";
function adminActionClass(variant: "default" | "primary" | "danger" = "default") {
  return cn(
    "flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2 text-[10px] font-medium",
    variant === "primary" && "border-primary bg-primary text-primary-foreground",
    variant === "danger" && "border-border bg-transparent text-red-400/80",
    variant === "default" && "border-border text-foreground/85",
  );
}

export function AdminListingCard({
  listing,
  showActions = false,
}: {
  listing: AdminListing;
  showActions?: boolean;
}) {
  return (
    <article className="touch-card overflow-hidden">
      <div className="flex gap-3 p-3">
        {listing.imageUrl ? (
          <div className="product-media product-media--xs listing-card-thumb">
            <ListingListImage
              src={listing.imageUrl}
              alt={listing.title}
              variant="row"
              className="product-media-img"
            />
          </div>
        ) : (
          <div className="product-media product-media--xs listing-card-thumb flex items-center justify-center text-[10px] text-muted">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-4">
              {listing.title}
            </h3>
            <p className="shrink-0 text-[12px] font-bold">
              {formatNaira(listing.price)}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {getCategoryName(listing.category)} · {listing.area}, {listing.city}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {listing.sellerName} · {listing.createdAt}
          </p>
        </div>
      </div>

      {showActions ? (
        <div className="grid grid-cols-4 gap-1 border-t border-border px-2 py-2">
          <Link href={`/listing/${listing.id}`} className={adminActionClass()}>
            View
          </Link>
          <form action={approveListing} className="min-w-0">
            <input type="hidden" name="listingId" value={listing.id} />
            <button type="submit" className={adminActionClass("primary")}>
              Approve
            </button>
          </form>
          <form action={rejectListing} className="min-w-0">
            <input type="hidden" name="listingId" value={listing.id} />
            <button type="submit" className={adminActionClass()}>
              Reject
            </button>
          </form>
          <form action={deleteAdminListing} className="min-w-0">
            <input type="hidden" name="listingId" value={listing.id} />
            <button type="submit" className={adminActionClass("danger")}>
              Delete
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export function AdminListingList({
  listings,
  showActions = false,
  emptyMessage,
}: {
  listings: AdminListing[];
  showActions?: boolean;
  emptyMessage: string;
}) {
  if (listings.length === 0) {
    return (
      <div className="rounded-app border border-dashed border-border p-4 text-center">
        <p className="text-[13px] text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {listings.map((listing) => (
        <AdminListingCard
          key={listing.id}
          listing={listing}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
