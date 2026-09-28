"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { submitContentReport } from "@/app/actions/moderation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import {
  REPORT_REASONS,
  type ContentReportType,
} from "@/lib/safety/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Shared "Report" sheet used by Community posts/replies, listing comments
 * and private chats. One lightweight flow for every content type.
 */
export function ReportSheet({
  contentType,
  contentId,
  open,
  onClose,
  isAuthenticated,
}: {
  contentType: ContentReportType;
  contentId: string;
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  // Reset the form whenever the sheet is re-opened for a different item.
  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails("");
      setError("");
      setSent(false);
    }
  }, [open, contentId]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isAuthenticated) {
      return;
    }
    if (!reason) {
      setError("Choose a reason for the report.");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await submitContentReport({
        contentType,
        contentId,
        reason,
        details: details.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      window.setTimeout(onClose, 1400);
    });
  }

  const loginHref = buildAuthHref("login", pathname);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={sent ? "Report sent" : "Report this"}
    >
      {sent ? (
        <div className="px-1 py-6 text-center">
          <p className="text-[14px] font-semibold text-foreground">
            Thanks for keeping AhiaUlo safe.
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Our team will review this report.
          </p>
        </div>
      ) : !isAuthenticated ? (
        <div className="px-1 py-4">
          <p className="text-[13px] text-muted">Sign in to report content.</p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="pb-2">
          <p className="px-1 pt-1 pb-2 text-[12px] text-muted">
            Tell us what is wrong. Reports are reviewed by our moderation team.
          </p>

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3">
            {REPORT_REASONS.map((item) => {
              const selected = reason === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setReason(item)}
                  aria-pressed={selected}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition duration-app",
                    selected
                      ? "border-primary/60 bg-primary/[0.06] font-semibold text-primary"
                      : "border-border/80 bg-surface text-foreground active:bg-surface-raised",
                  )}
                >
                  <span>{item}</span>
                  {selected ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything else we should know? (optional)"
            className="mt-3 w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
          />

          {error ? (
            <p className="mt-2 px-1 text-[12px] text-red-600">{error}</p>
          ) : null}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border px-4 text-[12px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !reason}
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Sending…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
}

/** Subtle trigger button — visually matches existing tiny text actions. */
export function ReportButton({
  onClick,
  label = "Report",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "cursor-pointer text-[11px] font-semibold text-muted transition duration-app hover:text-red-600",
        className,
      )}
    >
      {label}
    </button>
  );
}