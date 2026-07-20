export function normalizeNigerianPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  if (digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
    return `+234${digits}`;
  }

  return null;
}

export function isValidE164Phone(phone: string) {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

/** Show Nigerian numbers as 0810... instead of 234810... */
export function formatDisplayPhone(phone: string | null | undefined) {
  if (!phone) {
    return "";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length >= 13) {
    return `0${digits.slice(3, 13)}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }

  return phone.trim();
}

/** Canonical local form stored in public.profiles.phone (matches normalize_listing_phone). */
export function profilePhoneStorageFormat(input: string) {
  const e164 = normalizeNigerianPhone(input);
  const local = e164 ? formatDisplayPhone(e164) : formatDisplayPhone(input);
  return local.trim() || input.trim();
}

/** Mask middle digits for display, e.g. 0810•••263 */
export function maskDisplayPhone(phone?: string) {
  if (!phone) return "No phone";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}•••${digits.slice(-3)}`;
}

export function getTelHref(phone?: string) {
  if (!phone) return "#";
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits}`;
}
