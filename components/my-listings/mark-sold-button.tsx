"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { markListingSold } from "@/app/my-listings/actions";
import { actionButtonClass } from "@/components/my-listings/action-button-styles";
import { cn } from "@/lib/utils/cn";

type MarkSoldButtonProps = {
  listingId: string;
  isSold: boolean;
  compact?: boolean;
};

export function MarkSoldButton({ listingId, isSold, compact = false }: MarkSoldButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sold, setSold] = useState(isSold);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSold(isSold);
  }, [isSold]);

  function handleConfirm() {
    startTransition(async () => {
      const result = await markListingSold(listingId);

      if (result.success) {
        setSold(true);
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={sold || isPending}
        onClick={() => {
          if (!sold && !isPending) {
            setConfirmOpen(true);
          }
        }}
        className={cn(
          actionButtonClass(sold ? "sold" : "default", compact ? "compact" : "default"),
          (sold || isPending) && "cursor-default opacity-70",
        )}
      >
        Sold
      </button>

      {mounted && confirmOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4 sm:items-center"
              onClick={() => setConfirmOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-[16px] border border-border bg-surface p-4 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mark-sold-title"
              >
                <p
                  id="mark-sold-title"
                  className="text-[15px] font-semibold leading-5"
                >
                  Mark this item as sold?
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="h-11 rounded-full border border-border px-3 text-[13px] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="h-11 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    {isPending ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
