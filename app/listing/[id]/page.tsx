import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock3, Eye, MapPin } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingContactBar } from "@/components/listings/listing-contact-bar";
import { ListingImageGallery } from "@/components/listings/listing-image-gallery";
import { ListingViewTracker } from "@/components/listings/listing-view-tracker";
import { ListingWhatsappContact } from "@/components/listings/listing-whatsapp-contact";
import {
  getListingForViewer,
  getRelatedListings,
  getSellerContact,
  getSellerPhoneBySellerId,
  getSellerSoldCount,
  getViewerContext,
} from "@/lib/data/listings";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";
import { getTelHref, maskDisplayPhone } from "@/lib/utils/phone";

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListingForViewer(id);

  if (!listing) {
    notFound();
  }

  const { isAdmin } = await getViewerContext();

  const [relatedListings, soldCount] = await Promise.all([
    getRelatedListings(listing),
    listing.sellerId ? getSellerSoldCount(listing.sellerId) : 0,
  ]);

  let sellerPhone: string | null = null;
  if (listing.status === "approved" && listing.sellerId) {
    sellerPhone = await getSellerContact(listing.id);
    if (!sellerPhone) {
      sellerPhone = await getSellerPhoneBySellerId(listing.sellerId);
    }
  }

  const showSaveBar =
    !isAdmin && (listing.status === "approved" || listing.status === "pending");
  const showWhatsappContact = listing.status === "approved" && Boolean(sellerPhone);
  const soldLabel = `${soldCount} ${soldCount === 1 ? "item" : "items"}`;

  return (
    <>
      <main
        className={cn(
          "listing-detail-main min-h-dvh overflow-x-hidden pt-3",
          showSaveBar ? "pb-[120px]" : "pb-safe",
        )}
      >
        <div className="marketplace-listing-body min-w-0 space-y-3">
          {listing.status === "approved" && !isAdmin ? (
            <ListingViewTracker listingId={listing.id} />
          ) : null}

          <ListingImageGallery images={listing.images} title={listing.title} />

          <section className="min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="type-detail-price">{formatNaira(listing.price)}</p>
                <h1 className="type-detail-title mt-0.5">{listing.title}</h1>
              </div>
              {listing.verified ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-primary">
                  <BadgeCheck size={13} />
                  Verified
                </span>
              ) : isAdmin ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium capitalize text-muted">
                  {listing.status}
                </span>
              ) : null}
            </div>

            <div className="listing-detail-meta flex w-full flex-nowrap items-center justify-evenly">
              <InfoPill icon={<MapPin size={12} strokeWidth={2} />}>
                {listing.area}, {listing.city}
              </InfoPill>
              <InfoPill>{listing.condition}</InfoPill>
              <InfoPill icon={<Eye size={12} strokeWidth={2} />}>{formatViews(listing.views)}</InfoPill>
              <InfoPill icon={<Clock3 size={12} strokeWidth={2} />}>{listing.createdAt}</InfoPill>
            </div>
          </section>

          <section className="rounded-[14px] border border-border bg-surface p-2.5">
            <h2 className="text-[14px] font-medium text-foreground">Seller information</h2>
            <p className="mt-0.5 text-[11px] text-muted">Trusted seller</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <SellerStat label="Phone">
                {sellerPhone ? (
                  <a
                    href={getTelHref(sellerPhone)}
                    className="text-[11px] font-medium text-foreground/85 underline-offset-2 hover:underline"
                  >
                    {maskDisplayPhone(sellerPhone)}
                  </a>
                ) : (
                  <span className="text-[11px] text-muted">Unavailable</span>
                )}
              </SellerStat>
              <SellerStat label="Sold" value={soldLabel} />
              <SellerStat label="Views" value={formatViews(listing.views)} />
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="type-section-title">Description</h2>
            <p className="text-[14px] font-normal leading-6 text-muted">{listing.description}</p>
          </section>

          {showWhatsappContact && sellerPhone ? (
            <ListingWhatsappContact
              sellerPhone={sellerPhone}
              listingTitle={listing.title}
            />
          ) : null}

          <section className="pb-1">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="type-section-title">Related listings</h2>
              <Link href="/browse" className="type-link text-primary">
                Browse more
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {relatedListings.map((related) => (
                <ListingCard key={related.id} listing={related} />
              ))}
            </div>
          </section>
        </div>
      </main>

      {showSaveBar ? <ListingContactBar listing={listing} /> : null}
    </>
  );
}

function InfoPill({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-0 text-[12px] font-normal leading-none text-muted",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function SellerStat({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-border/80 bg-background/60 px-1.5 py-1.5">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="mt-0.5 line-clamp-1">
        {children ?? <span className="text-[11px] font-medium text-foreground">{value}</span>}
      </div>
    </div>
  );
}
