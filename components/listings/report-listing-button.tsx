"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportListing } from "@/app/actions/engagement";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  REPORT_LISTING_REASONS,
  type ReportListingReason,
} from "@/lib/types/engagement";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function ReportListingButton({
  listingId,
  isAuthenticated,
}: {
  listingId: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReportListingReason | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setError("");
    setMessage("");
    setSelected(null);

    if (!isAuthenticated) {
      router.push(buildAuthHref("login", `/listing/${listingId}`));
      return;
    }

    setOpen(true);
  }

  function submit() {
    if (!selected) {
      setError("Choose a reason.");
      return;
    }

    startTransition(async () => {
      const result = await reportListing(listingId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Thanks — our team will review this listing.");
      setTimeout(() => setOpen(false), 900);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-muted transition duration-app hover:text-foreground"
      >
        <Flag size={13} />
        Report listing
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Report listing">
        <div className="space-y-3 px-3 pb-4 pt-1">
          <p className="text-[13px] leading-5 text-muted">
            Tell us what’s wrong. Reporting won’t interrupt your browsing.
          </p>
          <div className="space-y-1.5">
            {REPORT_LISTING_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelected(reason)}
                className={cn(
                  "flex w-full cursor-pointer items-center rounded-[12px] border px-3 py-2.5 text-left text-[13px] font-medium transition duration-app",
                  selected === reason
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-surface-raised",
                )}
              >
                {reason}
              </button>
            ))}
          </div>
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
          {message ? <p className="text-[12px] text-primary">{message}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending || Boolean(message)}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
