import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/components/profile/complete-profile-form";
import { createClient } from "@/lib/supabase/server";
import { isPendingProfilePhone } from "@/lib/types/engagement";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Complete profile",
};

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = getSafeReturnPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile/complete")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, full_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !isPendingProfilePhone(profile.phone)) {
    redirect(next);
  }

  return (
    <main className="marketplace-page space-y-3 pb-4 pt-3">
      <section>
        <h1 className="type-page-title">Complete your profile</h1>
        <p className="type-page-sub mt-1">
          Add a phone number to chat with sellers and keep your account trusted.
        </p>
      </section>

      {profile?.avatar_url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url}
            alt=""
            className="size-12 rounded-full border border-border object-cover"
          />
          <p className="text-[13px] text-muted">Photo imported from Google</p>
        </div>
      ) : null}

      <Suspense fallback={<div className="touch-card h-48 skeleton" />}>
        <CompleteProfileForm
          initialFullName={profile?.full_name}
          initialUsername={profile?.username}
        />
      </Suspense>
    </main>
  );
}
