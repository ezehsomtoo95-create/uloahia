"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { useSaveToast } from "@/components/listings/save-toast";
import {
  buildListingShareContent,
  canUseNativeShare,
  copyListingLink,
  getFacebookShareUrl,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
  getXShareUrl,
  shareListingNative,
  type ListingShareInput,
} from "@/lib/share";
import { cn } from "@/lib/utils/cn";

type ShareListingProps = {
  listing: ListingShareInput;
  className?: string;
  buttonClassName?: string;
};

const SHARE_TARGETS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (text: string, _url: string) => getWhatsAppShareUrl(text),
    accent: "bg-[#25D366]/12 text-[#128C7E]",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: (_text: string, url: string) => getFacebookShareUrl(url),
    accent: "bg-[#1877F2]/12 text-[#1877F2]",
  },
  {
    id: "x",
    label: "X",
    href: (text: string, url: string) =>
      getXShareUrl(text.replace(url, "").replace(/\n{2,}/g, "\n").trim(), url),
    accent: "bg-foreground/8 text-foreground",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: (text: string, url: string) => getTelegramShareUrl(url, text),
    accent: "bg-[#229ED9]/12 text-[#229ED9]",
  },
] as const;

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function ShareListing({ listing, className, buttonClassName }: ShareListingProps) {
  const { showSaveToast } = useSaveToast();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusables = dialog ? getFocusable(dialog) : [];
    focusables[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const items = getFocusable(dialog);
      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  async function handleShareClick() {
    if (sharing) {
      return;
    }

    const content = buildListingShareContent(listing);

    if (canUseNativeShare()) {
      setSharing(true);
      const result = await shareListingNative(content);
      setSharing(false);

      if (result.ok || result.reason === "aborted") {
        return;
      }
    }

    setOpen(true);
  }

  async function handleCopyLink() {
    const content = buildListingShareContent(listing);
    try {
      await copyListingLink(content.url);
      setCopied(true);
      showSaveToast("Link copied!");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showSaveToast("Could not copy link.");
    }
  }

  const content = buildListingShareContent(listing);

  return (
    <div className={cn("mt-2", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => void handleShareClick()}
        disabled={sharing}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Share listing: ${content.title}`}
        className={cn(
          "flex h-[52px] w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-border bg-surface px-4 text-[15px] font-semibold tracking-[-0.01em] text-foreground transition duration-app hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99] disabled:opacity-60",
          buttonClassName,
        )}
      >
        <Share2 size={18} strokeWidth={2.2} aria-hidden />
        {sharing ? "Opening share…" : "Share listing"}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
              onClick={close}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn(
                  "flex w-full flex-col border border-border bg-surface shadow-xl",
                  "max-h-[min(72vh,520px)] rounded-t-[16px] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-[16px] sm:pb-0",
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
                  <div className="w-8 shrink-0" aria-hidden />
                  <h2
                    id={titleId}
                    className="type-section-title min-w-0 flex-1 truncate text-center text-[0.875rem]"
                  >
                    Share listing
                  </h2>
                  <button
                    type="button"
                    aria-label="Close share options"
                    onClick={close}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-text-secondary transition duration-app active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
                  <p className="px-1 text-[12px] leading-5 text-muted">
                    {content.title} · {content.priceLabel}
                  </p>

                  {SHARE_TARGETS.map((target) => (
                    <a
                      key={target.id}
                      href={target.href(content.text, content.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-background px-3 text-[14px] font-medium text-foreground transition duration-app hover:bg-surface-raised active:scale-[0.99]"
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full text-[11px] font-semibold",
                          target.accent,
                        )}
                        aria-hidden
                      >
                        {target.label.slice(0, 1)}
                      </span>
                      {target.label}
                    </a>
                  ))}

                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="flex h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-background px-3 text-left text-[14px] font-medium text-foreground transition duration-app hover:bg-surface-raised active:scale-[0.99]"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                    </span>
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
