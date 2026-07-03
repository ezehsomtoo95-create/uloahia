"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border border-border bg-surface p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-[15px] font-semibold leading-5">{title}</p>
        {description ? (
          <p className="mt-2 text-[13px] text-muted">{description}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 rounded-full border border-border px-3 text-[13px] font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={
              destructive
                ? "h-11 rounded-full bg-red-500/90 px-3 text-[13px] font-semibold text-white disabled:opacity-70"
                : "h-11 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-70"
            }
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
