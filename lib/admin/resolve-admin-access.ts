import "server-only";

import { ADMIN_PHONE } from "@/lib/constants/admin";
import {
  buildAdminCheckDebugInfo,
  phonesMatch,
  type AdminAccessMethod,
  type AdminCheckDebugInfo,
} from "@/lib/utils/admin-phone";
import { createClient } from "@/lib/supabase/server";

export type { AdminAccessMethod, AdminCheckDebugInfo };

export type AdminAccessResult = {
  isAdmin: boolean;
  method: AdminAccessMethod;
  debug: AdminCheckDebugInfo;
};

type ResolveAdminAccessInput = {
  profilePhone?: string | null;
  userPhone?: string | null;
};

export async function resolveAdminAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: ResolveAdminAccessInput,
): Promise<AdminAccessResult> {
  const profilePhone = input.profilePhone?.trim() || null;
  const userPhone = input.userPhone?.trim() || null;
  const candidatePhones = [profilePhone, userPhone].filter(Boolean) as string[];
  const debug = buildAdminCheckDebugInfo(profilePhone, userPhone);

  const { data: phoneAdmin, error: phoneAdminError } = await supabase.rpc(
    "is_phone_admin",
  );

  if (!phoneAdminError && phoneAdmin === true) {
    return { isAdmin: true, method: "rpc_is_phone_admin", debug };
  }

  const { data: jwtAdmin, error: jwtAdminError } = await supabase.rpc("is_admin");

  if (!jwtAdminError && jwtAdmin === true) {
    return { isAdmin: true, method: "rpc_is_admin", debug };
  }

  if (ADMIN_PHONE) {
    for (const phone of candidatePhones) {
      if (phonesMatch(phone, ADMIN_PHONE)) {
        return { isAdmin: true, method: "env_phone_match", debug };
      }
    }
  }

  return { isAdmin: false, method: "none", debug };
}
