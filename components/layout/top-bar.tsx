"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSelector } from "@/components/layout/language-selector";
import { RegionSelector } from "@/components/layout/region-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";

export function TopBar() {
  return (
    <header className="marketplace-topbar market-topbar market-chrome-brand fixed inset-x-0 top-0 z-40 border-b border-emerald-400/15 bg-[#064E3B] lg:sticky lg:z-50">
      <div className="app-container market-topbar-inner">
        <div className="market-topbar-row">
          <Link href="/" className="market-logo text-emerald-50" aria-label={BRAND_NAME}>
            <Image
              src="/icon.png"
              alt=""
              width={36}
              height={36}
              className="market-logo-icon"
              priority
            />
            <span className="market-logo-copy">
              <span className="market-logo-word text-emerald-50">{BRAND_NAME}</span>
              <span className="market-logo-tagline text-emerald-50/75">{BRAND_TAGLINE}</span>
            </span>
          </Link>

          <div className="market-topbar-actions">
            <LanguageSelector />
            <RegionSelector />
            <ThemeToggle className="market-chrome-btn--icon" />
          </div>
        </div>
      </div>
    </header>
  );
}
