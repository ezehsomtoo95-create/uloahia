import { getListingWhatsAppMessage, getWhatsAppHref } from "@/lib/utils/whatsapp";

type ListingWhatsappContactProps = {
  sellerPhone: string;
  listingTitle: string;
  compact?: boolean;
};

export function ListingWhatsappContact({
  sellerPhone,
  listingTitle,
}: ListingWhatsappContactProps) {
  const href = getWhatsAppHref(sellerPhone, getListingWhatsAppMessage(listingTitle));

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex h-[52px] w-full min-w-0 items-center justify-center rounded-[14px] bg-[#25D366] px-4 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-app hover:opacity-95 active:opacity-90"
    >
      WhatsApp Contact
    </a>
  );
}
