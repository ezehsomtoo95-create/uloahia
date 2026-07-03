"use client";

import { ChevronLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export function BottomSheet({
  open,
  onClose,
  title,
  onBack,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[min(72vh,520px)] w-full flex-col rounded-t-[16px] border border-border bg-surface shadow-xl",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="grid w-8 shrink-0 place-items-center">
            {onBack ? (
              <button
                type="button"
                aria-label="Back"
                onClick={onBack}
                className="grid size-8 place-items-center rounded-full text-text-secondary transition duration-app active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
          </div>
          <h2
            id="bottom-sheet-title"
            className="type-section-title min-w-0 flex-1 truncate text-center text-[0.875rem]"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full text-text-secondary transition duration-app active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function BottomSheetOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-border/60 py-3 text-left text-[0.875rem] font-normal leading-snug transition duration-app last:border-b-0 active:bg-surface-raised",
        selected ? "text-primary" : "text-foreground",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected ? (
        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}
