import "server-only";

/** Development-only owner access. Set to your signup phone (+234... or 0810...). */
export const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "";

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^234/, "0");
}

export function isAdminPhoneMatch(
  profilePhone: string | null | undefined,
  adminPhone: string = ADMIN_PHONE,
) {
  if (!profilePhone || !adminPhone) {
    return false;
  }

  return normalizePhone(profilePhone) === normalizePhone(adminPhone);
}
