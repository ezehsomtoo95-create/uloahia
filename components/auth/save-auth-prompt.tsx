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
      className="auth-modal-backdrop fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="auth-modal w-full max-w-sm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-auth-title"
      >
        <h2 id="save-auth-title" className="auth-modal__title">
          Save listings
        </h2>
        <p className="auth-modal__text">
          Create an account to keep your saved items.
        </p>
        <div className="auth-modal__actions">
          <Link
            href={buildAuthHref("login", returnPath)}
            onClick={onClose}
            className="auth-btn-secondary auth-modal__link"
          >
            Login
          </Link>
          <Link
            href={buildAuthHref("signup", returnPath)}
            onClick={onClose}
            className="auth-btn-primary auth-modal__link"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
