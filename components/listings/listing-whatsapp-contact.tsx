import { getListingWhatsAppMessage, getWhatsAppHref } from "@/lib/utils/whatsapp";

type ListingWhatsappContactProps = {
  sellerPhone: string;
  listingTitle: string;
};

export function ListingWhatsappContact({
  sellerPhone,
  listingTitle,
}: ListingWhatsappContactProps) {
  const href = getWhatsAppHref(sellerPhone, getListingWhatsAppMessage(listingTitle));

  return (
    <section className="mt-5 min-w-0">
      <h2 className="type-section-title">Contact seller</h2>
      <p className="mt-1.5 text-[13px] font-normal leading-5 text-muted">
        Chat with seller on WhatsApp
      </p>
      <p className="mt-2 max-w-full break-words text-[12px] font-normal leading-[1.45] text-muted">
        Message seller directly to ask about availability, delivery, or negotiate price.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex h-[52px] w-full min-w-0 items-center justify-center rounded-[14px] bg-[#7ED9AE] px-4 text-[15px] font-semibold tracking-[-0.01em] text-[#0B0B0B] transition-opacity duration-app hover:opacity-95 active:opacity-90"
      >
        Chat seller
      </a>
    </section>
  );
}
