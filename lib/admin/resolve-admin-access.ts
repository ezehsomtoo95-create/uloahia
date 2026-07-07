import "server-only";

import { ADMIN_EMAIL } from "@/lib/constants/admin";
import {
  buildAdminCheckDebugInfo,
  emailsMatch,
  type AdminAccessMethod,
  type AdminCheckDebugInfo,
} from "@/lib/utils/admin-access";
import { createClient } from "@/lib/supabase/server";

export type { AdminAccessMethod, AdminCheckDebugInfo };

export type AdminAccessResult = {
  isAdmin: boolean;
  method: AdminAccessMethod;
  debug: AdminCheckDebugInfo;
};

type ResolveAdminAccessInput = {
  userEmail?: string | null;
};

export async function resolveAdminAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: ResolveAdminAccessInput,
): Promise<AdminAccessResult> {
  const userEmail = input.userEmail?.trim() || null;
  const debug = buildAdminCheckDebugInfo(userEmail);

  const { data: emailAdmin, error: emailAdminError } = await supabase.rpc(
    "is_email_admin",
  );

  if (!emailAdminError && emailAdmin === true) {
    return { isAdmin: true, method: "rpc_is_email_admin", debug };
  }

  const { data: jwtAdmin, error: jwtAdminError } = await supabase.rpc("is_admin");

  if (!jwtAdminError && jwtAdmin === true) {
    return { isAdmin: true, method: "rpc_is_admin", debug };
  }

  if (userEmail && emailsMatch(userEmail, ADMIN_EMAIL)) {
    return { isAdmin: true, method: "env_email_match", debug };
  }

  return { isAdmin: false, method: "none", debug };
}
