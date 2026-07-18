import Link from "next/link";
import { BadgeCheck, Eye } from "lucide-react";
import type { Listing } from "@/lib/types";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";

export function MyListingCard({
  listing,
  actions,
}: {
  listing: Listing;
  actions: React.ReactNode;
}) {
  const metaParts = [
    `${listing.area}, ${listing.city}`,
    listing.createdAt,
    formatViews(listing.views),
    listing.verified ? "Verified" : null,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "my-listing-card",
        listing.status === "sold" && "my-listing-card-sold",
      )}
    >
      <div className="relative flex gap-2.5">
        <StatusBadge status={listing.status} />
        {listing.imageUrl ? (
          <div className="product-media product-media--sm my-listing-thumb">
            <ListingListImage
              src={listing.imageUrl}
              alt={listing.title}
              variant="row"
              className="product-media-img"
            />
          </div>
        ) : (
          <div className="product-media product-media--sm my-listing-thumb flex items-center justify-center text-[10px] text-muted">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="my-listing-price">{formatNaira(listing.price)}</p>
          <h2 className="my-listing-title">{listing.title}</h2>
          <p className="my-listing-meta">
            {metaParts.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 ? <span aria-hidden>·</span> : null}
                {part === "Verified" ? (
                  <span className="inline-flex items-center gap-0.5 text-primary">
                    <BadgeCheck size={11} />
                    Verified
                  </span>
                ) : part?.includes("views") ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Eye size={11} />
                    {part}
                  </span>
                ) : (
                  part
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      {listing.status === "sold" ? (
        <p className="my-listing-sold-note">This item has been marked as sold</p>
      ) : null}

      <div className="my-listing-actions">{actions}</div>
    </article>
  );
}

export function MyListingEditLink({ listingId }: { listingId: string }) {
  return (
    <Link href={`/sell?edit=${listingId}`} className="my-listing-action-btn">
      Edit
    </Link>
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
        "my-listing-status",
        status === "approved" && "my-listing-status-live",
        status === "pending" && "my-listing-status-pending",
        status === "sold" && "my-listing-status-sold",
        status === "rejected" && "my-listing-status-rejected",
      )}
    >
      {label}
    </span>
  );
}
