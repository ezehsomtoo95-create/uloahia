import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { deleteListing, relistListing } from "@/app/my-listings/actions";
import { ActionCell, actionButtonClass } from "@/components/my-listings/action-button-styles";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { MarkSoldButton } from "@/components/my-listings/mark-sold-button";
import { BRAND_NAME } from "@/lib/constants/brand";
import { getCurrentUser, getMyListings } from "@/lib/data/listings";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";

export default async function MyListingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const listings = await getMyListings();

  return (
    <main className="space-y-4 pb-6 pt-3">

      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="type-page-title">My listings</h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage your submitted household items.
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-full bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground"
        >
          New
        </Link>
      </section>

      <section className="space-y-3.5">
        {listings.length > 0 ? (
          listings.map((listing) => (
            <article
              key={listing.id}
              className={cn(
                "relative touch-card overflow-hidden p-4",
                listing.status === "sold" && "opacity-95",
              )}
            >
              <StatusBadge status={listing.status} />

              <div className="flex items-start gap-3">
                {listing.imageUrl ? (
                  <div className="relative size-[84px] shrink-0 overflow-hidden rounded-[12px]">
                    <ListingListImage
                      src={listing.imageUrl}
                      alt={listing.title}
                      variant="row"
                      className="size-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="flex size-[84px] shrink-0 items-center justify-center rounded-[12px] bg-surface-raised text-[10px] text-muted">
                    No photo
                  </div>
                )}

                <div className="min-w-0 flex-1 pr-12">
                  <p className="text-[15px] font-bold leading-tight text-foreground">
                    {formatNaira(listing.price)}
                  </p>
                  <h2 className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug text-foreground">
                    {listing.title}
                  </h2>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden text-[11px] leading-4 text-muted">
                    <span className="min-w-0 flex-1 truncate">
                      {listing.area}, {listing.city}
                    </span>
                    <span className="shrink-0" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 whitespace-nowrap">{listing.createdAt}</span>
                    <span className="shrink-0" aria-hidden>
                      ·
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap">
                      <Eye size={11} strokeWidth={2} />
                      {formatViews(listing.views)}
                    </span>
                  </p>
                </div>
              </div>

              {listing.status === "sold" ? (
                <p className="mt-2 text-[11px] text-muted">
                  This item has been marked as sold
                </p>
              ) : null}

              <div className="mt-2.5 flex flex-nowrap gap-2">
                <ActionCell>
                  <ActionForm action={relistListing} listingId={listing.id} label="Relist" />
                </ActionCell>
                <ActionCell>
                  <Link
                    href={`/sell?edit=${listing.id}`}
                    className={cn(actionButtonClass(), "w-full")}
                  >
                    Edit
                  </Link>
                </ActionCell>
                <ActionCell>
                  <MarkSoldButton listingId={listing.id} isSold={listing.status === "sold"} />
                </ActionCell>
                <ActionCell>
                  <ActionForm
                    action={deleteListing}
                    listingId={listing.id}
                    label="Delete"
                    danger
                  />
                </ActionCell>
              </div>
            </article>
          ))
        ) : (
          <section className="rounded-app border border-dashed border-border p-4 text-center">
            <h2 className="text-[15px] font-semibold">You have no listings yet.</h2>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              Be the first real seller on {BRAND_NAME}.
            </p>
            <Link
              href="/sell"
              className="mt-3 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
            >
              Post an item
            </Link>
          </section>
        )}
      </section>
    </main>
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
        "absolute right-4 top-4 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide",
        status === "approved" && "bg-primary text-primary-foreground",
        status === "pending" && "border border-border bg-background text-muted",
        status === "sold" && "border border-primary/30 bg-primary/10 text-primary",
        status === "rejected" && "border border-border text-muted",
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
    <form action={action} className="w-full min-w-0">
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className={actionButtonClass(danger ? "danger" : "default")}>
        {label}
      </button>
    </form>
  );
}
