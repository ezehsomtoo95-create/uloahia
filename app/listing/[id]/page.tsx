import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock3, Eye, MapPin, Store } from "lucide-react";
import { ListingCommentsSection } from "@/components/listings/listing-comments-section";
import { ListingChatButton } from "@/components/listings/listing-chat-button";
import { ListingViewTracker } from "@/components/listings/listing-view-tracker";
import { ListingWhatsappContact } from "@/components/listings/listing-whatsapp-contact";
import { RelatedListingsSection } from "@/components/listings/related-listings-section";
import { ReportListingButton } from "@/components/listings/report-listing-button";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { getListingComments } from "@/lib/data/listing-comments";
import {
  getListingForViewer,
  getRelatedListings,
  getSellerContact,
  getSellerPhoneBySellerId,
  getSellerSoldCount,
  getViewerContext,
} from "@/lib/data/listings";
import { getPublicSellerById } from "@/lib/data/sellers";
import { formatListingLocation, formatNaira, formatViews, sanitizeListingTitle } from "@/lib/utils/format";
import { maskDisplayPhone } from "@/lib/utils/phone";

const ListingImageGallery = dynamic(
  () =>
    import("@/components/listings/listing-image-gallery").then(
      (mod) => mod.ListingImageGallery,
    ),
  {
    loading: () => (
      <div className="aspect-square w-full skeleton rounded-none sm:rounded-[1rem]" />
    ),
  },
);

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

  const { user, isAdmin } = await getViewerContext();

  const [relatedListings, soldCount, sellerProfile, comments] = await Promise.all([
    getRelatedListings(listing),
    listing.sellerId ? getSellerSoldCount(listing.sellerId) : 0,
    listing.sellerId ? getPublicSellerById(listing.sellerId) : null,
    listing.status === "approved" ? getListingComments(listing.id) : Promise.resolve([]),
  ]);

  let sellerPhone: string | null = null;
  if (listing.status === "approved" && listing.sellerId) {
    sellerPhone = await getSellerContact(listing.id);
    if (!sellerPhone) {
      sellerPhone = await getSellerPhoneBySellerId(listing.sellerId);
    }
  }

  const soldLabel = `${soldCount} ${soldCount === 1 ? "item" : "items"} sold`;
  const isOwnListing = Boolean(user && listing.sellerId === user.id);
  const storeHref = listing.sellerId ? `/store/${listing.sellerId}` : null;
  const sellerName =
    sellerProfile?.fullName || sellerProfile?.username || "Trusted seller";
  const displayTitle = sanitizeListingTitle(listing.title);
  const locationLabel = formatListingLocation(listing.area, listing.city, 0);

  return (
    <main className="market-pdp listing-detail-main min-h-dvh overflow-x-hidden pb-safe">
      <div className="market-pdp-layout marketplace-listing-body">
        {listing.status === "approved" && !isAdmin ? (
          <ListingViewTracker listingId={listing.id} sellerId={listing.sellerId} />
        ) : null}

        <div className="market-pdp-gallery">
          <ListingImageGallery images={listing.images} title={displayTitle} />
        </div>

        <div className="market-pdp-summary">
          <section className="market-pdp-offer">
            <div className="market-pdp-offer-top">
              <p className="market-pdp-price">{formatNaira(listing.price)}</p>
              {listing.verified ? (
                <span className="market-pdp-verified">
                  <BadgeCheck size={14} strokeWidth={2.2} />
                  Verified
                </span>
              ) : isAdmin ? (
                <span className="market-pdp-status">{listing.status}</span>
              ) : null}
            </div>
            <h1 className="market-pdp-title">{displayTitle}</h1>
            <ul className="market-pdp-facts">
              <li title={locationLabel}>
                <MapPin size={13} strokeWidth={2} />
                <span>{locationLabel}</span>
              </li>
              <li>
                <span>{listing.condition}</span>
              </li>
              <li>
                <Eye size={13} strokeWidth={2} />
                <span>{formatViews(listing.views)}</span>
              </li>
              <li>
                <Clock3 size={13} strokeWidth={2} />
                <span>{listing.createdAt}</span>
              </li>
            </ul>
          </section>

          <section className="market-pdp-seller">
            {storeHref ? (
              <Link href={storeHref} className="market-pdp-seller-link">
                <div className="market-pdp-seller-avatar" aria-hidden>
                  {sellerProfile?.avatarUrl ? (
                    <LazyAvatar
                      src={sellerProfile.avatarUrl}
                      size={44}
                      className="size-full rounded-full"
                    />
                  ) : (
                    <Store size={18} strokeWidth={1.75} />
                  )}
                </div>
                <div className="market-pdp-seller-copy">
                  <p className="market-pdp-seller-name">{sellerName}</p>
                  <p className="market-pdp-seller-meta">
                    {soldLabel}
                    {sellerProfile?.memberSinceLabel
                      ? ` · Member since ${sellerProfile.memberSinceLabel}`
                      : null}
                    {sellerProfile ? ` · ${sellerProfile.activeListingCount} active` : null}
                  </p>
                  <div className="market-pdp-seller-trust">
                    {sellerProfile?.phoneVerified ? <span>Phone on file</span> : null}
                    {sellerPhone ? (
                      <span>{maskDisplayPhone(sellerPhone)}</span>
                    ) : (
                      <span className="is-muted">Phone after contact</span>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <>
                <div className="market-pdp-seller-avatar" aria-hidden>
                  <Store size={18} strokeWidth={1.75} />
                </div>
                <div className="market-pdp-seller-copy">
                  <p className="market-pdp-seller-name">{sellerName}</p>
                  <p className="market-pdp-seller-meta">{soldLabel}</p>
                </div>
              </>
            )}
            {storeHref ? (
              <Link href={storeHref} className="market-pdp-seller-shop">
                View shop
              </Link>
            ) : null}
          </section>

          <section className="market-pdp-description">
            <h2 className="market-pdp-section-label">Description</h2>
            <p>{listing.description}</p>
          </section>

          {listing.status === "approved" ? (
            <section className="market-pdp-contact">
              <h2 className="market-pdp-section-label">Contact seller</h2>
              <p className="market-pdp-contact-hint">
                Message in AhiaUlo or reach out on WhatsApp when available.
              </p>
              <ListingChatButton
                listingId={listing.id}
                isAuthenticated={Boolean(user)}
                isOwnListing={isOwnListing}
              />
              {!isOwnListing ? (
                sellerPhone ? (
                  <ListingWhatsappContact
                    sellerPhone={sellerPhone}
                    listingTitle={displayTitle}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-2 flex h-[52px] w-full cursor-not-allowed items-center justify-center rounded-[14px] bg-[#25D366]/40 px-4 text-[15px] font-semibold text-white"
                    title="Seller has not added a WhatsApp number yet"
                  >
                    WhatsApp Contact
                  </button>
                )
              ) : null}
              {!isOwnListing ? (
                <div className="market-pdp-report">
                  <ReportListingButton
                    listingId={listing.id}
                    isAuthenticated={Boolean(user)}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {listing.status === "approved" ? (
            <ListingCommentsSection
              listingId={listing.id}
              comments={comments}
              isAuthenticated={Boolean(user)}
              currentUserId={user?.id ?? null}
            />
          ) : null}
        </div>

        <RelatedListingsSection listings={relatedListings} />
      </div>
    </main>
  );
}
