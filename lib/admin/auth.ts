import "server-only";

import { redirect } from "next/navigation";
import { ADMIN_PHONE, isAdminPhoneMatch, normalizePhone } from "@/lib/constants/admin";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export function isAdminPhone(phone: string | null | undefined) {
  return isAdminPhoneMatch(phone, ADMIN_PHONE);
}

export function assertIsPhoneAdmin(profilePhone: string) {
  return isAdminPhoneMatch(profilePhone, ADMIN_PHONE);
}

async function seedAdminConfig(phone: string) {
  const normalized = normalizePhone(phone);

  const { error } = await supabaseAdmin().from("app_config").upsert(
    { key: "admin_phone", value: normalized },
    { onConflict: "key" },
  );

  if (error) {
    console.error("[admin] app_config seed failed", {
      message: error.message,
      code: error.code,
      normalized,
    });
    return false;
  }

  return true;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const profilePhone = profile?.phone ?? user.phone ?? "";
  const { isAdmin } = resolveAdminAccess({
    profilePhone: profile?.phone,
    userPhone: user.phone,
  });

  if (!isAdmin) {
    redirect("/");
  }

  await seedAdminConfig(profilePhone);

  return {
    supabase,
    user,
    profile: profile ?? { phone: profilePhone, full_name: null },
  };
}
