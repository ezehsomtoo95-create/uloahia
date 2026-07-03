import { BRAND_NAME } from "@/lib/constants/brand";

export function getListingWhatsAppMessage(itemName: string) {
  const title = itemName.trim() || "item";

  return `Hi, I am interested in your ${title} listed on ${BRAND_NAME}. Is it still available?`;
}

export function getWhatsAppHref(phone: string, message: string) {
  const normalizedPhone = phone.replace(/\D/g, "");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
