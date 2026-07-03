import "server-only";

import { ADMIN_PHONE } from "@/lib/constants/admin";
import {
  buildAdminCheckDebugInfo,
  normalizePhone,
  phonesMatch,
  type AdminAccessMethod,
  type AdminCheckDebugInfo,
} from "@/lib/utils/admin-phone";

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

/** Admin UI/route access is granted only when phone matches ADMIN_PHONE env var. */
export function resolveAdminAccess(
  input: ResolveAdminAccessInput,
): AdminAccessResult {
  const profilePhone = input.profilePhone?.trim() || null;
  const userPhone = input.userPhone?.trim() || null;
  const adminPhone = ADMIN_PHONE.trim() || null;
  const candidatePhones = [profilePhone, userPhone].filter(Boolean) as string[];
  const debug = buildAdminCheckDebugInfo(profilePhone, userPhone);

  console.log("[resolveAdminAccess] raw phone values", {
    profilePhone,
    userPhone,
    ADMIN_PHONE: adminPhone,
  });

  console.log("[resolveAdminAccess] normalized phone values", {
    profilePhoneNormalized: profilePhone ? normalizePhone(profilePhone) : null,
    userPhoneNormalized: userPhone ? normalizePhone(userPhone) : null,
    adminPhoneNormalized: adminPhone ? normalizePhone(adminPhone) : null,
  });

  if (!adminPhone) {
    console.log(
      "[resolveAdminAccess] ADMIN_PHONE env var is empty — access denied",
    );
    return { isAdmin: false, method: "none", debug };
  }

  for (const phone of candidatePhones) {
    const normalizedCandidate = normalizePhone(phone);
    const normalizedAdmin = normalizePhone(adminPhone);
    const match = phonesMatch(phone, adminPhone);

    console.log("[resolveAdminAccess] env_phone_match comparison", {
      profilePhone,
      candidatePhone: phone,
      ADMIN_PHONE: adminPhone,
      normalizedCandidate,
      normalizedAdmin,
      match,
    });

    if (match) {
      console.log("[resolveAdminAccess] granted via env_phone_match");
      return { isAdmin: true, method: "env_phone_match", debug };
    }
  }

  console.log("[resolveAdminAccess] denied", { method: "none", debug });
  return { isAdmin: false, method: "none", debug };
}
