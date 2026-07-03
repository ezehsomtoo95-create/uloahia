import "server-only";

import { redirect } from "next/navigation";
import {
  ADMIN_PHONE,
  isAdminPhoneMatch,
  normalizePhone,
} from "@/lib/constants/admin";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export function isAdminPhone(phone: string | null | undefined) {
  return isAdminPhoneMatch(phone, ADMIN_PHONE);
}

export async function assertIsPhoneAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profilePhone: string,
) {
  const { data, error } = await supabase.rpc("is_phone_admin");

  console.log("[admin] is_phone_admin rpc", {
    data,
    error: error?.message ?? null,
    code: error?.code ?? null,
    profilePhone: normalizePhone(profilePhone),
  });

  if (!error && data === true) {
    return true;
  }

  const envMatch = isAdminPhoneMatch(profilePhone, ADMIN_PHONE);
  console.log("[admin] is_phone_admin env fallback", { envMatch });

  return envMatch;
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
  const match = isAdminPhoneMatch(profilePhone, ADMIN_PHONE);

  if (!match) {
    redirect("/");
  }

  await seedAdminConfig(profilePhone);

  return {
    supabase,
    user,
    profile: profile ?? { phone: profilePhone, full_name: null },
  };
}
