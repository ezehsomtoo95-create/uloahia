"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { startListingConversation } from "@/app/actions/engagement";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export function ListingChatButton({
  listingId,
  isAuthenticated,
  isOwnListing,
}: {
  listingId: string;
  isAuthenticated: boolean;
  isOwnListing: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const loginHref = useMemo(
    () => buildAuthHref("login", `/listing/${listingId}`),
    [listingId],
  );

  if (isOwnListing) {
    return null;
  }

  function handleClick() {
    setError("");

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    startTransition(async () => {
      const result = await startListingConversation(listingId);
      if (!result.ok) {
        if (result.error.toLowerCase().includes("phone")) {
          router.push(`/profile/complete?next=/listing/${listingId}`);
          return;
        }
        setError(result.error);
        return;
      }

      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "flex h-[52px] w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-border bg-surface px-4 text-[15px] font-semibold tracking-[-0.01em] text-foreground transition duration-app hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99] disabled:opacity-60",
        )}
      >
        <MessageCircle size={18} strokeWidth={2.2} />
        {pending ? "Opening chat…" : "Chat with Seller"}
      </button>
      {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}
