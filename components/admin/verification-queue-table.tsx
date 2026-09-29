"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ShieldCheck, X } from "lucide-react";
import {
  approveVerificationRequest,
  createVerificationPreviewUrl,
  rejectVerificationRequest,
} from "@/app/admin/verification-actions";
import { useAdminToast } from "@/components/admin/admin-toast";
import { formatDisplayPhone } from "@/lib/utils/phone";
import { cn } from "@/lib/utils/cn";
import type { AdminVerificationRow } from "@/lib/data/admin-verification";
import { VERIFICATION_DOC_TYPE_LABELS } from "@/lib/types/engagement";

function actionButtonClass(
  variant: "default" | "primary" | "danger" = "default",
) {
  return cn(
    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[11px] font-medium transition duration-app disabled:opacity-50",
    variant === "primary" && "border-primary bg-primary text-primary-foreground",
    variant === "danger" && "border-border text-red-500/90",
    variant === "default" && "border-border text-foreground/85",
  );
}

export function VerificationQueueTable({
  rows,
}: {
  rows: AdminVerificationRow[];
}) {
  const router = useRouter();
  const { showAdminToast } = useAdminToast();
  const [previewError, setPreviewError] = useState("");
  const [rejecting, setRejecting] = useState<AdminVerificationRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-border px-3 py-10 text-center">
        <p className="text-[12px] text-muted">Nothing to review here.</p>
      </div>
    );
  }

  function openPreview(row: AdminVerificationRow) {
    setPreviewError("");
    startTransition(async () => {
      const result = await createVerificationPreviewUrl(row.id);
      if (!result.ok) {
        setPreviewError(result.error);
        return;
      }
      // New tab so the admin can compare the document against the account
      // details listed alongside it.
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function approve(row: AdminVerificationRow) {
    startTransition(async () => {
      const result = await approveVerificationRequest(row.id);
      if (!result.success) {
        showAdminToast(result.error ?? "Could not approve.");
        return;
      }
      showAdminToast(`${row.sellerName} is now ID verified.`);
      router.refresh();
    });
  }

  function submitReject() {
    if (!rejecting) return;
    startTransition(async () => {
      const result = await rejectVerificationRequest(rejecting.id, rejectReason);
      if (!result.success) {
        showAdminToast(result.error ?? "Could not reject.");
        return;
      }
      showAdminToast("Submission rejected.");
      setRejecting(null);
      setRejectReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {previewError ? (
        <p className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[12px] text-red-500">
          {previewError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {rows.map((row) => {
          const isReviewed = row.status !== "pending";
          return (
            <div
              key={row.id}
              className="flex flex-col gap-3 border-b border-border/70 px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[13px] font-semibold">
                    {row.sellerName}
                  </p>
                  {row.sellerUsername ? (
                    <span className="text-[11px] text-muted">
                      @{row.sellerUsername}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                    {VERIFICATION_DOC_TYPE_LABELS[
                      row.docType as keyof typeof VERIFICATION_DOC_TYPE_LABELS
                    ] ?? "ID document"}
                  </span>
                  {isReviewed ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        row.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-red-500/15 text-red-500",
                      )}
                    >
                      {row.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  Submitted {row.submittedAt} · {row.sellerListingCount} active
                  listing{row.sellerListingCount === 1 ? "" : "s"}
                  {row.sellerPhone
                    ? ` · ${formatDisplayPhone(row.sellerPhone)}`
                    : " · no phone on file"}
                </p>
                {row.rejectionReason ? (
                  <p className="mt-1 text-[11px] text-red-500/90">
                    Reason: {row.rejectionReason}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || isReviewed}
                  onClick={() => openPreview(row)}
                  className={actionButtonClass()}
                >
                  <ExternalLink size={12} aria-hidden />
                  View ID
                </button>
                {isReviewed ? null : (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => approve(row)}
                      className={actionButtonClass("primary")}
                    >
                      <ShieldCheck size={12} aria-hidden />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setRejecting(row);
                        setRejectReason("");
                      }}
                      className={actionButtonClass("danger")}
                    >
                      <X size={12} aria-hidden />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rejecting ? (
        <div className="rounded-[12px] border border-border bg-surface p-3">
          <p className="text-[12px] font-semibold">
            Reject {rejecting.sellerName}&apos;s submission
          </p>
          <p className="mt-1 text-[11px] text-muted">
            The seller sees this reason, so say what was wrong with the document
            rather than only that it was rejected.
          </p>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. The photo is too blurry to read the date of birth."
            className="mt-2 w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary/40"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(null)}
              className={actionButtonClass()}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={submitReject}
              className={actionButtonClass("danger")}
            >
              Reject submission
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
