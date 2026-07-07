import Link from "next/link";
import { signOut } from "@/app/profile/actions";
import { AdminAccessDebugLogger } from "@/components/profile/admin-access-debug-logger";
import { AdminDashboardButton } from "@/components/profile/admin-dashboard-button";
import { ProfileSupportSettings } from "@/components/profile/profile-support-settings";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";
import { BRAND_NAME } from "@/lib/constants/brand";

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
        .select("phone, full_name, state, city")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const adminAccess = user
    ? await resolveAdminAccess(supabase, {
        userEmail: user.email,
      })
    : null;
  const showAdminCard = adminAccess?.isAdmin ?? false;

  return (
    <main className="marketplace-page flex min-h-[calc(100vh-72px)] flex-col pt-3">
      {adminAccess ? (
        <AdminAccessDebugLogger
          debug={adminAccess.debug}
          isAdmin={adminAccess.isAdmin}
          method={adminAccess.method}
        />
      ) : null}
      <div className="flex-1 overflow-y-auto pb-safe">
        <div className="space-y-3 pb-4">
          <section>
            <h1 className="type-page-title">Profile</h1>
            <p className="type-page-sub mt-1">
              Manage your {BRAND_NAME} account, listings, and saved items.
            </p>
          </section>

          {user ? (
            <>
              <div className="touch-card p-4">
                <h2 className="text-[16px] font-medium">
                  {profile?.full_name || "Your account"}
                </h2>
                <p className="mt-1 text-[13px] text-muted">{user.email}</p>
                {profile?.phone ? (
                  <p className="mt-1 text-[12px] text-muted">
                    {formatDisplayPhone(profile.phone)}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-muted">
                  Status: {user.email_confirmed_at ? "Email verified" : "Email not verified"}
                </p>
                {profile?.city ? (
                  <p className="mt-1 text-[12px] text-muted">
                    {profile.city}, {profile.state}
                  </p>
                ) : null}
              </div>

              <div className="touch-card divide-y divide-border overflow-hidden rounded-3xl">
                <Link className="block p-4 text-[14px] font-medium" href="/my-listings">
                  My listings
                </Link>
                <Link className="block p-4 text-[14px] font-medium" href="/saved">
                  Saved listings
                </Link>
              </div>

              {showAdminCard ? (
                <div className="touch-card flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-medium leading-4">Admin</h2>
                    <p className="text-[11px] text-muted">Manage marketplace</p>
                  </div>
                  <AdminDashboardButton />
                </div>
              ) : null}

              <div className="touch-card w-full overflow-hidden rounded-3xl">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="block w-full p-3.5 text-left text-[14px] font-medium text-muted"
                  >
                    Sign out
                  </button>
                </form>
              </div>

              <ProfileSupportSettings />
            </>
          ) : (
            <div className="touch-card overflow-hidden rounded-3xl p-4">
              <h2 className="text-[16px] font-semibold">Log in to manage your account</h2>
              <p className="mt-1 text-[13px] leading-5 text-muted">
                You need an account to sell, save listings, and contact sellers.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex h-10 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
              >
                Log in
              </Link>
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
