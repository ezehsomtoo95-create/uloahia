"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  activateUserById,
  deleteUserById,
  fetchAdminUserDetail,
  suspendUserById,
} from "@/app/admin/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import type { AdminUserDetail } from "@/lib/data/admin-detail";
import { cn } from "@/lib/utils/cn";

type AdminUserManageModalProps = {
  userId: string | null;
  onClose: () => void;
  onUpdated: (userId: string, patch: { accountStatus?: string; removed?: boolean }) => void;
};

function actionButtonClass(variant: "default" | "primary" | "danger" = "default") {
  return cn(
    "h-9 rounded-full border px-3 text-[11px] font-medium",
    variant === "primary" && "border-primary bg-primary text-primary-foreground",
    variant === "danger" && "border-border text-red-400/90",
    variant === "default" && "border-border text-foreground/85",
  );
}

export function AdminUserManageModal({
  userId,
  onClose,
  onUpdated,
}: AdminUserManageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError("");

    fetchAdminUserDetail(userId)
      .then(setDetail)
      .catch(() => setError("Could not load user."))
      .finally(() => setLoading(false));
  }, [userId]);

  function runAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    patch?: { accountStatus?: string; removed?: boolean },
  ) {
    if (!userId) {
      return;
    }

    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        setError(result.error ?? "Action failed.");
        return;
      }

      setError("");

      if (patch?.removed) {
        onUpdated(userId, { removed: true });
        onClose();
        return;
      }

      if (patch?.accountStatus) {
        onUpdated(userId, { accountStatus: patch.accountStatus });
      }

      const refreshed = await fetchAdminUserDetail(userId);
      setDetail(refreshed);
      setDeleteOpen(false);
    });
  }

  if (!mounted || !userId) {
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
            <p className="text-[15px] font-semibold">Manage User</p>
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
              <p className="text-[13px] text-muted">Loading user...</p>
            ) : !detail ? (
              <p className="text-[13px] text-muted">User not found.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-[16px] font-semibold">{detail.name}</h3>
                  <p className="mt-1 text-[12px] text-muted">
                    {detail.email ?? "No email on file"}
                  </p>
                  <p className="text-[12px] text-muted">{detail.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Info label="Joined" value={detail.joinedAt} />
                  <Info label="Account status" value={detail.accountStatus} />
                  <Info label="Listings posted" value={String(detail.listingsPosted)} />
                  <Info label="Listings sold" value={String(detail.listingsSold)} />
                  {detail.city ? <Info label="City" value={detail.city} /> : null}
                  {detail.state ? <Info label="State" value={detail.state} /> : null}
                </div>

                {error ? <p className="text-[12px] text-red-400/90">{error}</p> : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {detail.accountStatus === "active" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => suspendUserById(detail.id), {
                          accountStatus: "suspended",
                        })
                      }
                      className={actionButtonClass()}
                    >
                      Suspend user
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => activateUserById(detail.id), {
                          accountStatus: "active",
                        })
                      }
                      className={actionButtonClass("primary")}
                    >
                      Activate user
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeleteOpen(true)}
                    className={actionButtonClass("danger")}
                  >
                    Delete user
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminConfirmDialog
        open={deleteOpen}
        title="Delete this user permanently?"
        description="This removes the user account and their marketplace data."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => runAction(() => deleteUserById(detail!.id), { removed: true })}
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
