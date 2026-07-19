"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function AvatarLightbox({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean;
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[min(90dvh,900px)] max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export function AvatarCircle({
  src,
  displayName,
  sizeClassName = "size-20",
  className,
  editable = false,
  onEdit,
}: {
  src: string | null;
  displayName: string;
  sizeClassName?: string;
  className?: string;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const initial = (displayName || "A").slice(0, 1).toUpperCase();

  return (
    <>
      <div className={cn("relative shrink-0", sizeClassName, className)}>
        <button
          type="button"
          onClick={() => {
            if (src) setLightboxOpen(true);
          }}
          disabled={!src}
          className={cn(
            "grid size-full place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-neutral-100 text-[1.1rem] font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
            src ? "cursor-zoom-in" : "cursor-default",
          )}
          aria-label={src ? "View profile photo" : "No profile photo"}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </button>
        {editable ? (
          <button
            type="button"
            onClick={onEdit}
            className="absolute inset-x-0 bottom-0 flex justify-center rounded-b-full bg-black/45 py-0.5 text-white"
            aria-label="Change profile photo"
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide">Edit</span>
          </button>
        ) : null}
      </div>
      <AvatarLightbox
        open={lightboxOpen}
        src={src}
        alt={`${displayName} profile photo`}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
