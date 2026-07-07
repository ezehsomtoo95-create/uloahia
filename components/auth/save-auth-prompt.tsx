"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { buildAuthHref } from "@/lib/utils/auth-redirect";

export function SaveAuthPrompt({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  const returnPath = pathname || "/";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border border-border bg-surface p-4 shadow-xl"

        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-auth-title"
      >
        <h2 id="save-auth-title" className="type-section-title">
          Save listings
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Create an account to keep your saved items.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={buildAuthHref("login", returnPath)}
            onClick={onClose}
            className="type-btn flex h-11 items-center justify-center rounded-full border border-border px-3 text-[13px]"

          >
            Login
          </Link>
          <Link
            href={buildAuthHref("signup", returnPath)}
            onClick={onClose}
            className="type-btn flex h-11 items-center justify-center rounded-full bg-primary px-3 text-[13px] text-primary-foreground"

          >
            Sign up
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
