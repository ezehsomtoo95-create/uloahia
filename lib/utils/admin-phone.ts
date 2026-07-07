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
