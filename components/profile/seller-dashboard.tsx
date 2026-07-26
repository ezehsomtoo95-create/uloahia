"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { PhoneNumberManager } from "@/components/profile/phone-number-manager";
import { ProfileAvatarUploader } from "@/components/profile/profile-avatar-uploader";
import { ProfileUsernameEditor } from "@/components/profile/profile-username-editor";
import { cn } from "@/lib/utils/cn";

type SellerDashboardProps = {
  sellerId: string;
  displayName: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  memberSince: string | null;
  locationLabel: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneLabel: string | null;
  phoneRaw: string;
  needsPhone: boolean;
  activeListings: number;
  totalViews: number;
  salesCount: number;
};

function formatMetric(value: number) {
  if (value < 1000) return String(value);
  if (value < 10_000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value / 1000)}k`;
}

export function SellerDashboard({
  sellerId,
  displayName,
  email,
  username,
  avatarUrl,
  memberSince,
  locationLabel,
  emailVerified,
  phoneVerified,
  phoneLabel,
  phoneRaw,
  needsPhone,
  activeListings,
  totalViews,
  salesCount,
}: SellerDashboardProps) {
  // Bold header tracks live profiles.username (same source as cards/storefront).
  const [headerName, setHeaderName] = useState(username?.trim() || displayName);

  useEffect(() => {
    setHeaderName(username?.trim() || displayName);
  }, [username, displayName]);

  const metrics = [
    { label: "Active", value: formatMetric(activeListings) },
    { label: "Views", value: formatMetric(totalViews) },
    { label: "Sales", value: formatMetric(salesCount) },
  ] as const;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ProfileAvatarUploader avatarUrl={avatarUrl} displayName={headerName} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.125rem] font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              {headerName}
            </h2>
            {(emailVerified || phoneVerified) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <BadgeCheck size={12} strokeWidth={2.2} />
                Verified
              </span>
            )}
          </div>

          <ProfileUsernameEditor
            username={username}
            onUsernameChange={setHeaderName}
          />
          {email ? (
            <p className="mt-0.5 truncate text-[13px] text-neutral-600 dark:text-neutral-400">
              {email}
            </p>
          ) : null}

          <PhoneNumberManager
            phoneLabel={phoneLabel}
            phoneRaw={phoneRaw}
            needsPhone={needsPhone}
          />

          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-neutral-600 dark:text-neutral-400">
            <span>
              Member since{" "}
              <strong className="font-semibold text-neutral-950 dark:text-neutral-50">
                {memberSince || "—"}
              </strong>
            </span>
            {locationLabel ? (
              <>
                <span aria-hidden>·</span>
                <span>{locationLabel}</span>
              </>
            ) : null}
          </p>

          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-neutral-600 dark:text-neutral-400">
            <span>
              Email{" "}
              <strong className="font-semibold text-neutral-950 dark:text-neutral-50">
                {emailVerified ? "verified" : "not verified"}
              </strong>
            </span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/store/${sellerId}`}
              className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200"
            >
              View storefront
            </Link>
            {needsPhone ? (
              <Link
                href="/profile/complete"
                className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-[12px] font-semibold text-primary-foreground"
              >
                Complete profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-[1.05rem] font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
              {metric.value}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3",
        )}
      >
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-neutral-950 dark:text-neutral-50">
            My Listings
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
            {activeListings > 0
              ? `${activeListings} active · edit, mark sold, or remove`
              : "Post an item to start selling"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sell"
            className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground"
          >
            New
          </Link>
          <Link
            href="/my-listings"
            className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200"
          >
            Open
          </Link>
        </div>
      </div>
    </section>
  );
}
