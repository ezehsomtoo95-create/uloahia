import { BRAND_NAME, DOMAIN } from "@/lib/constants/brand";

export const SUPPORT_EMAIL = `support@${DOMAIN}`;

/** E.164 digits only, no + prefix (for wa.me links). */
export const SUPPORT_WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "2348000000000";

export const SUPPORT_WHATSAPP_MESSAGE = `Hi ${BRAND_NAME}, I need help with my account.`;

export const SUPPORT_WHATSAPP_HREF = `https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${encodeURIComponent(SUPPORT_WHATSAPP_MESSAGE)}`;

export const SUPPORT_MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${BRAND_NAME} support`)}`;
