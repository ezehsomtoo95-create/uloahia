import { signOut } from "@/app/profile/actions";
import { AdminAccessDebugLogger } from "@/components/profile/admin-access-debug-logger";
import { AdminDashboardButton } from "@/components/profile/admin-dashboard-button";
import { AccountNavLinks } from "@/components/profile/account-nav-links";
import { ProfileGuestPanel } from "@/components/profile/profile-guest-panel";
import { ProfileSupportSettings } from "@/components/profile/profile-support-settings";
import { SellerDashboard } from "@/components/profile/seller-dashboard";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";
import { BRAND_NAME } from "@/lib/constants/brand";
import { getMyListings, getSellerSoldCount } from "@/lib/data/listings";
import { getPublicSellerById } from "@/lib/data/sellers";
import { isPendingProfilePhone } from "@/lib/types/engagement";

import { createClient } from "@/lib/supabase/server";
import { formatDisplayPhone } from "@/lib/utils/phone";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("phone, full_name, state, city, username, avatar_url, phone_verified_at, created_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const [publicSeller, myListings, salesCount] = user
    ? await Promise.all([
        getPublicSellerById(user.id),
        getMyListings(),
        getSellerSoldCount(user.id),
      ])
    : [null, [], 0];

  const adminAccess = user
    ? await resolveAdminAccess(supabase, {
        userEmail: user.email,
      })
    : null;
  const showAdminCard = adminAccess?.isAdmin ?? false;
  const needsPhone = isPendingProfilePhone(profile?.phone);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-NG", {
        month: "short",
        year: "numeric",
      })
    : publicSeller?.memberSinceLabel ?? null;
  const locationLabel = [profile?.city, profile?.state].filter(Boolean).join(", ") || null;
  const activeListings =
    publicSeller?.activeListingCount ??
    myListings.filter((listing) => listing.status === "approved").length;
  const totalViews =
    publicSeller?.totalViews ??
    myListings.reduce((sum, listing) => sum + (listing.views ?? 0), 0);

  return (
    <main className={user ? "account-page" : "account-page account-page--guest"}>
      {adminAccess ? (
        <AdminAccessDebugLogger
          debug={adminAccess.debug}
          isAdmin={adminAccess.isAdmin}
          method={adminAccess.method}
        />
      ) : null}

      {user ? (
        <>
          <header className="market-page-head">
            <h1 className="market-page-title text-neutral-950 dark:text-neutral-50">
              Seller dashboard
            </h1>
            <p className="market-page-sub">
              Your {BRAND_NAME} account, performance, and listings.
            </p>
          </header>

          <SellerDashboard
            sellerId={user.id}
            displayName={profile?.full_name || "Your account"}
            email={user.email ?? null}
            username={profile?.username ?? publicSeller?.username ?? null}
            avatarUrl={profile?.avatar_url ?? publicSeller?.avatarUrl ?? null}
            memberSince={memberSince}
            locationLabel={locationLabel}
            emailVerified={Boolean(user.email_confirmed_at)}
            phoneVerified={Boolean(profile?.phone_verified_at)}
            phoneLabel={
              profile?.phone && !needsPhone ? formatDisplayPhone(profile.phone) : null
            }
            phoneRaw={profile?.phone && !needsPhone ? profile.phone : ""}
            needsPhone={needsPhone}
            activeListings={activeListings}
            totalViews={totalViews}
            salesCount={salesCount}
          />

          <AccountNavLinks storeHref={`/store/${user.id}`} />

          {showAdminCard ? (
            <div className="flex items-center justify-between gap-3 border-y border-border py-2.5">
              <div className="min-w-0">
                <h2 className="text-[13px] font-medium leading-4 text-neutral-950 dark:text-neutral-50">
                  Admin
                </h2>
                <p className="text-[11px] text-muted">Manage marketplace</p>
              </div>
              <AdminDashboardButton />
            </div>
          ) : null}

          <nav className="account-nav" aria-label="Session">
            <form action={signOut}>
              <button type="submit" className="text-muted">
                Sign out
              </button>
            </form>
          </nav>

          <ProfileSupportSettings showAccountActions />
        </>
      ) : (
        <ProfileGuestPanel />
      )}
    </main>
  );
}
