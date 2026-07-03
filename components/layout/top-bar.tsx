import Link from "next/link";
import { MapPin } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";

export function TopBar() {
  return (
    <header className="marketplace-topbar fixed inset-x-0 top-0 z-40 border-b border-border bg-background lg:static lg:inset-auto">
      <div className="app-container flex h-14 items-center justify-between">
        <Link href="/" className="flex flex-col gap-0.5">
          <span className="type-brand">{BRAND_NAME}</span>
          <span className="type-brand-sub">{BRAND_TAGLINE}</span>
        </Link>

        <Link
          href="/browse"
          className="type-btn flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[12px]"
        >
          <MapPin size={14} className="text-primary" />
          Eastern NG
        </Link>
      </div>
    </header>
  );
}
