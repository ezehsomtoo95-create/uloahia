import "server-only";

import {
  normalizePhone,
  phonesMatch,
} from "@/lib/utils/admin-phone";

/** Development-only owner access. Set to your signup phone (+234... or 0810...). */
export const ADMIN_PHONE = (process.env.ADMIN_PHONE ?? "").trim();

export { normalizePhone };

export function isAdminPhoneMatch(
  profilePhone: string | null | undefined,
  adminPhone: string = ADMIN_PHONE,
) {
  return phonesMatch(profilePhone, adminPhone);
}
