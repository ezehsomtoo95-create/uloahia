import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants/brand";
import { getApprovedListings } from "@/lib/data/listings";

export default async function PlaygroundPage() {
  const listings = await getApprovedListings(1);
  const listingHref = listings[0] ? `/listing/${listings[0].id}` : "/browse";
  const previews = [
    {
      label: "Home",
      href: "/",
      helper: "Search, categories, live marketplace sections.",
    },
    {
      label: "Browse",
      href: "/browse",
      helper: "Sticky filters, result count, dense two-column grid.",
    },
    {
      label: "Listing",
      href: listingHref,
      helper: listings[0]
        ? "Image-first detail page with seller trust and WhatsApp CTA."
        : "Create and approve the first listing to preview details.",
    },
    {
      label: "Sell",
      href: "/sell",
      helper: "Photo-first draft flow with publish success.",
    },
  ];

  return (
    <main className="space-y-4 pb-6 pt-3">
      <section>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
          Hidden review route
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-[-0.03em]">
          {BRAND_NAME} previews
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Quick links for reviewing the Phase 1.5 mobile product feel.
        </p>
      </section>

      <section className="grid gap-2.5">
        {previews.map((preview) => (
          <Link
            key={preview.href}
            href={preview.href}
            className="touch-card flex items-center justify-between gap-3 p-3"
          >
            <div>
              <h2 className="text-[15px] font-semibold">{preview.label}</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {preview.helper}
              </p>
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
