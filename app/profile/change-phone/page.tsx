import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AuthCard,
  AuthHeading,
  AuthPageShell,
} from "@/components/auth/auth-primitives";
import { ChangePhoneForm } from "@/components/profile/change-phone-form";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/server";

export default async function ChangePhonePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile/change-phone");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const currentPhone = profile?.phone ?? user.phone ?? "";

  return (
    <AuthPageShell centered={false}>
      <div className="marketplace-page space-y-3 pt-3">
        <AuthHeading
          eyebrow={BRAND_NAME}
          title="Change phone number"
          description="Verify your new number with OTP before it replaces your current login phone."
        />

        <AuthCard>
          <ChangePhoneForm currentPhone={currentPhone} />
        </AuthCard>

        <Link href="/profile" className="auth-btn-ghost auth-btn-ghost--muted block text-center">
          Back to profile
        </Link>
      </div>
    </AuthPageShell>
  );
}
