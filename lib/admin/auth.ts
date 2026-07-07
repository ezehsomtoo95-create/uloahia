import "server-only";

import { redirect } from "next/navigation";
import { resolveAdminAccess } from "@/lib/admin/resolve-admin-access";
import { normalizeAdminEmail } from "@/lib/utils/admin-access";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export async function assertIsAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return false;
  }

  const { isAdmin, method } = await resolveAdminAccess(supabase, {
    userEmail: user.email,
  });

  console.log("[admin] assertIsAdmin", {
    isAdmin,
    method,
    userEmail: normalizeAdminEmail(user.email),
  });

  return isAdmin;
}

async function seedAdminConfig(email: string) {
  const normalized = normalizeAdminEmail(email);

  const { error } = await supabaseAdmin().from("app_config").upsert(
    { key: "admin_email", value: normalized },

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

  if (!user?.email) {

    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const adminAccess = await resolveAdminAccess(supabase, {
    userEmail: user.email,
  });

  if (!adminAccess.isAdmin) {
    redirect("/");
  }

  await seedAdminConfig(user.email);


  return {
    supabase,
    user,
    profile: profile ?? { phone: "", full_name: null },

  };
}
