import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BoostFlow, type BoostPackageOption } from "@/components/boost/boost-flow";
import { getActiveBoostPackages } from "@/lib/boost/packages";
import { getCurrentUser, getListingForViewer } from "@/lib/data/listings";
import { formatBoostExpiryDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boost your listing",
  description:
    "Get more visibility for your AhiaUlo listing and reach more buyers with a Boost.",
};

type Props = {
  params: Promise<{ listingId: string }>;
};

export default async function BoostListingPage({ params }: Props) {
  const { listingId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=" + encodeURIComponent(`/boost/${listingId}`));
  }

  const listing = await getListingForViewer(listingId);
  if (!listing) {
    notFound();
  }

  const isOwnListing = listing.sellerId === user.id;
  if (!isOwnListing) {
    redirect(`/listing/${listingId}`);
  }

  const packages = await getActiveBoostPackages();

  const isEligible = listing.status === "approved";
  const alreadyBoosted = computeActiveBoostFromListing(listing);

  const options: BoostPackageOption[] = packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    durationDays: pkg.durationDays,
    price: pkg.priceNgn,
    isPopular: pkg.isPopular,
  }));

  return (
    <main className="boost-page min-h-dvh pb-safe">
      <div className="account-page">
        <BoostFlow
          listingId={listing.id}
          listingTitle={listing.title}
          packages={options}
          isEligible={isEligible}
          alreadyBoosted={isOwnListing && alreadyBoosted}
          boostExpiresAtLabel={
            alreadyBoosted && listing.boostExpiresAt
              ? formatBoostExpiryDate(listing.boostExpiresAt)
              : null
          }
        />
        <p className="mt-6 text-center text-xs text-muted">
          Boost payments are processed securely by Paystack. Boosting increases
          visibility but never guarantees a sale.
        </p>
        <p className="mt-2 text-center">
          <Link href="/my-listings" className="text-xs font-medium text-primary underline">
            Back to My Listings
          </Link>
          <span aria-hidden className="mx-2 text-muted">
            ·
          </span>
          <Link href={`/listing/${listing.id}`} className="text-xs font-medium text-primary underline">
            View listing
          </Link>
        </p>
      </div>
    </main>
  );
}

function isActiveBoost(boostExpiresAt?: string | null) {
  if (!boostExpiresAt) return false;
  return new Date(boostExpiresAt).getTime() > Date.now();
}

function computeActiveBoostFromListing(listing: {
  status: string;
  isBoosted?: boolean;
  boostExpiresAt?: string | null;
}) {
  return (
    listing.status === "approved" &&
    (listing.isBoosted || isActiveBoost(listing.boostExpiresAt))
  );
}