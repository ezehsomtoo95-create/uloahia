import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { HomeCategoryFeed } from "@/components/home/home-category-feed";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  HERO_HEADLINE,
  HERO_SUBTITLE,
  SEARCH_PLACEHOLDER,
} from "@/lib/constants/brand";
import { MARKETPLACE_HERO_IMAGE } from "@/lib/constants/category-imagery";
import { getDiscoveryCategories } from "@/lib/data/categories";
import { getApprovedListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [newListings, discoveryCategories] = await Promise.all([
    getApprovedListings(36),
    getDiscoveryCategories(),
  ]);

  return (
    <main className="marketplace-page--home market-home">
      <section className="market-hero">
        <div className="market-hero-media" aria-hidden="true">
          <Image
            src={MARKETPLACE_HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 72rem"
            className="object-cover object-center"
          />
          <div className="market-hero-veil" />
        </div>
        <div className="market-hero-content">
          <p className="market-hero-eyebrow">
            {BRAND_NAME}
            <span className="market-hero-accent" aria-hidden>
              ·
            </span>
            {BRAND_TAGLINE}
          </p>
          <h1 className="market-hero-title">{HERO_HEADLINE}</h1>
          <p className="market-hero-sub">{HERO_SUBTITLE}</p>
          <Link href="/browse" className="market-hero-search">
            <Search size={18} strokeWidth={2.1} />
            <span>{SEARCH_PLACEHOLDER}</span>
          </Link>
        </div>
      </section>

      <HomeCategoryFeed categories={discoveryCategories} listings={newListings} />

      <footer className="market-home-foot">
        {BRAND_NAME} · {BRAND_TAGLINE}
      </footer>
    </main>
  );
}
