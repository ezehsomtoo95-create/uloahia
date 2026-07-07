import "server-only";

import { emailsMatch } from "@/lib/utils/admin-access";

/** Marketplace owner email for admin console access. Override via ADMIN_EMAIL in production. */
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "ezehsomtoo95@gmail.com";

export { normalizeAdminEmail, emailsMatch } from "@/lib/utils/admin-access";

export function isAdminEmailMatch(
  userEmail: string | null | undefined,
  adminEmail: string = ADMIN_EMAIL,
) {
  return emailsMatch(userEmail, adminEmail);

}
