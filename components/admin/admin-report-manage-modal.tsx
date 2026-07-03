"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  deleteReportedListing,
  dismissReportById,
  fetchAdminReportDetail,
  suspendReportedSeller,
} from "@/app/admin/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import type { AdminReportDetail } from "@/lib/data/admin-detail";
import { cn } from "@/lib/utils/cn";

type AdminReportManageModalProps = {
  reportId: string | null;
  onClose: () => void;
  onUpdated: (reportId: string) => void;
  onViewListing: (listingId: string) => void;
  onViewSeller: (sellerId: string) => void;
};

function actionButtonClass(variant: "default" | "primary" | "danger" = "default") {
  return cn(
    "h-9 rounded-full border px-3 text-[11px] font-medium",
    variant === "primary" && "border-primary bg-primary text-primary-foreground",
    variant === "danger" && "border-border text-red-400/90",
    variant === "default" && "border-border text-foreground/85",
  );
}

export function AdminReportManageModal({
  reportId,
  onClose,
  onUpdated,
  onViewListing,
  onViewSeller,
}: AdminReportManageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!reportId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError("");

    fetchAdminReportDetail(reportId)
      .then(setDetail)
      .catch(() => setError("Could not load report."))
      .finally(() => setLoading(false));
  }, [reportId]);

  function runAction(action: () => Promise<{ success: boolean; error?: string }>, closeAfter = false) {
    if (!reportId) {
      return;
    }

    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        setError(result.error ?? "Action failed.");
        return;
      }

      setError("");
      onUpdated(reportId);

      if (closeAfter) {
        onClose();
        return;
      }

      const refreshed = await fetchAdminReportDetail(reportId);
      setDetail(refreshed);
      setDeleteOpen(false);
    });
  }

  if (!mounted || !reportId) {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] border border-border bg-surface sm:rounded-[16px]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[15px] font-semibold">Reported Listing</p>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full border border-border"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-[13px] text-muted">Loading report...</p>
            ) : !detail ? (
              <p className="text-[13px] text-muted">Report not found.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-[16px] font-semibold">{detail.listingTitle}</h3>
                  <p className="mt-1 text-[12px] text-muted">Reported {detail.createdAt}</p>
                </div>
                <div className="rounded-[12px] border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Reason
                  </p>
                  <p className="mt-1 text-[13px]">{detail.reason}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Info label="Listing status" value={detail.listingStatus} />
                  <Info label="Seller" value={detail.sellerName} />
                </div>

                {error ? <p className="text-[12px] text-red-400/90">{error}</p> : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => dismissReportById(detail.id), true)}
                    className={actionButtonClass("primary")}
                  >
                    Dismiss report
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeleteOpen(true)}
                    className={actionButtonClass("danger")}
                  >
                    Delete listing
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => suspendReportedSeller(detail.id))}
                    className={actionButtonClass()}
                  >
                    Suspend seller
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewListing(detail.listingId)}
                    className={actionButtonClass()}
                  >
                    View listing
                  </button>
                  {detail.sellerId ? (
                    <button
                      type="button"
                      onClick={() => onViewSeller(detail.sellerId)}
                      className={actionButtonClass()}
                    >
                      View seller
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminConfirmDialog
        open={deleteOpen}
        title="Delete reported listing?"
        description="This permanently removes the listing and dismisses related reports."
        confirmLabel="Delete listing"
        destructive
        isPending={isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => runAction(() => deleteReportedListing(detail!.id), true)}
      />
    </>,
    document.body,
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border/70 px-2.5 py-2">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-0.5 text-[12px] font-medium capitalize">{value}</p>
    </div>
  );
}
