import { maskDisplayPhone } from "@/lib/utils/phone";

/** Aligns with DB normalize_listing_phone (0007 migration). */
export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length >= 13) {
    digits = `0${digits.slice(3, 13)}`;
  } else if (digits.startsWith("234")) {
    digits = `0${digits.slice(3)}`;
  }

  if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = `0${digits}`;
  }

  return digits;
}

export function phonesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

export type AdminAccessMethod =
  | "rpc_is_phone_admin"
  | "rpc_is_admin"
  | "env_phone_match"
  | "none";

export type AdminCheckDebugInfo = {
  profilePhoneMasked: string;
  userPhoneMasked: string;
  activePhoneSource: "profile" | "user" | "none";
  activePhoneMasked: string;
  normalizedDigitCount: number;
  normalizedLast4: string;
};

/** Safe debug payload — no full numbers, no admin secrets. */
export function buildAdminCheckDebugInfo(
  profilePhone?: string | null,
  userPhone?: string | null,
): AdminCheckDebugInfo {
  const profile = profilePhone?.trim() || "";
  const user = userPhone?.trim() || "";
  const activePhone = profile || user;
  const normalized = activePhone ? normalizePhone(activePhone) : "";

  return {
    profilePhoneMasked: maskDisplayPhone(profilePhone ?? undefined),
    userPhoneMasked: maskDisplayPhone(userPhone ?? undefined),
    activePhoneSource: profile ? "profile" : user ? "user" : "none",
    activePhoneMasked: maskDisplayPhone(activePhone || undefined),
    normalizedDigitCount: normalized.length,
    normalizedLast4: normalized.slice(-4) || "none",
  };
}
