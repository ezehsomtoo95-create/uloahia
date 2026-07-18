"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  adminUpdateListing,
  deleteListingById,
  fetchAdminListingDetail,
  toggleFeatureListingById,
  updateListingStatus,
} from "@/app/admin/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { useAdminToast } from "@/components/admin/admin-toast";
import type { AdminListingDetail } from "@/lib/data/admin-detail";
import { LISTING_CONDITIONS } from "@/lib/constants/listings";
import { getCategoryName } from "@/lib/constants/categories";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type AdminListingViewPanelProps = {
  listingId: string | null;
  onClose: () => void;
  onUpdated: (listingId: string, patch: { status?: string; removed?: boolean }) => void;
};

type CategoryOption = { id: string; slug: string; name: string };

function actionButtonClass(variant: "default" | "primary" | "danger" = "default") {
  return cn(
    "inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-full border px-4 text-[12px] font-medium disabled:opacity-60",
    variant === "primary" && "border-primary bg-primary text-primary-foreground",
    variant === "danger" &&
      "border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/15",
    variant === "default" && "border-border bg-background text-foreground/90",
  );
}

function ActionFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">{children}</div>
  );
}

export function AdminListingManageModal({
  listingId,
  onClose,
  onUpdated,
}: AdminListingViewPanelProps) {
  const router = useRouter();
  const { showAdminToast } = useAdminToast();
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<AdminListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    state: "",
    city: "",
    area: "",
  });
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    void supabase
      .from("categories")
      .select("id, slug, name, parent_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{
          id: string;
          slug: string;
          name: string;
          parent_id: string | null;
        }>;
        const parents = new Set(rows.map((row) => row.parent_id).filter(Boolean));
        const leaves = rows.filter((row) => !parents.has(row.id) || row.parent_id);
        // Prefer leaf categories (have parent) for listing assignment
        const options = rows
          .filter((row) => row.parent_id !== null)
          .map((row) => ({ id: row.id, slug: row.slug, name: row.name }));
        setCategoryOptions(options.length > 0 ? options : leaves.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
        })));
      });
  }, []);

  useEffect(() => {
    if (!listingId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError("");
    setEditing(false);
    setRejectReason("");

    fetchAdminListingDetail(listingId)
      .then((next) => {
        console.log("View modal loaded listing:", listingId, next ? "found" : "not found");
        setDetail(next);
        if (next) {
          setDraft({
            title: next.title,
            description: next.description,
            price: String(next.price),
            category: next.category,
            condition: next.condition,
            state: next.state,
            city: next.city,
            area: next.area,
          });
        }
      })
      .catch(() => setError("Could not load listing."))
      .finally(() => setLoading(false));
  }, [listingId]);

  function runAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    patch?: { status?: string; removed?: boolean; close?: boolean },
  ) {
    if (!listingId) {
      return;
    }

    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        const message = result.error ?? "Action failed.";
        setError(message);
        showAdminToast(message);
        return;
      }

      setError("");
      setRejectOpen(false);
      setDeleteOpen(false);

      if (patch?.removed) {
        onUpdated(listingId, { removed: true });
        router.refresh();
        onClose();
        return;
      }

      if (patch?.status) {
        onUpdated(listingId, { status: patch.status });
      }

      router.refresh();

      if (patch?.close) {
        onClose();
        return;
      }

      const refreshed = await fetchAdminListingDetail(listingId);
      setDetail(refreshed);
      setEditing(false);

      if (refreshed && patch?.status) {
        onUpdated(listingId, { status: refreshed.status });
      }
    });
  }

  if (!mounted || !listingId) {
    return null;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] overflow-hidden">
        <button
          type="button"
          aria-label="Close listing review"
          className="absolute inset-0 bg-black/50 lg:bg-black/30"
          onClick={onClose}
        />

        <div
          className="admin-listing-view-panel fixed inset-0 z-[9999] h-dvh max-h-dvh overflow-hidden bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:h-dvh lg:max-h-dvh lg:w-[min(28rem,100vw)] lg:border-l lg:border-border lg:shadow-xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
            <p className="text-[15px] font-semibold">View Listing</p>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full border border-border"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="admin-listing-view-panel-body min-h-0 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-[13px] text-muted">Loading listing...</p>
            ) : !detail ? (
              <p className="text-[13px] text-muted">Listing not found.</p>
            ) : editing ? (
              <div className="space-y-2 pb-4">
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px] outline-none"
                  placeholder="Title"
                />
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-[13px] outline-none"
                  placeholder="Description"
                />
                <input
                  value={draft.price}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, price: event.target.value }))
                  }
                  inputMode="numeric"
                  className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px] outline-none"
                  placeholder="Price"
                />
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px] outline-none"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                  {categoryOptions.length === 0 && draft.category ? (
                    <option value={draft.category}>{getCategoryName(draft.category)}</option>
                  ) : null}
                </select>
                <select
                  value={draft.condition}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, condition: event.target.value }))
                  }
                  className="h-10 w-full rounded-full border border-border bg-background px-3 text-[13px] outline-none"
                >
                  {LISTING_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={draft.state}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, state: event.target.value }))
                    }
                    className="h-10 rounded-full border border-border bg-background px-3 text-[12px] outline-none"
                    placeholder="State"
                  />
                  <input
                    value={draft.city}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, city: event.target.value }))
                    }
                    className="h-10 rounded-full border border-border bg-background px-3 text-[12px] outline-none"
                    placeholder="City"
                  />
                  <input
                    value={draft.area}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, area: event.target.value }))
                    }
                    className="h-10 rounded-full border border-border bg-background px-3 text-[12px] outline-none"
                    placeholder="Area"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {detail.images.length > 0 ? (
                  <div className="admin-listing-view-panel-images pb-1">
                    {detail.images.map((image) => (
                      <div
                        key={image}
                        className="product-media product-media--lg border border-border"
                      >
                        <ListingListImage
                          src={image}
                          alt={detail.title}
                          variant="row"
                          className="product-media-img"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div>
                  <h3 className="text-[17px] font-semibold leading-5">{detail.title}</h3>
                  <p className="mt-1 text-[15px] font-bold">{formatNaira(detail.price)}</p>
                </div>

                <p className="text-[13px] leading-5 text-muted">{detail.description}</p>

                <div className="rounded-[12px] border border-border px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Seller
                  </p>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug">
                    {detail.seller.name}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">
                    {detail.seller.phone}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Info label="Category" value={detail.categoryLabel} />
                  <Info label="Condition" value={detail.condition} />
                  <Info label="Location" value={`${detail.area}, ${detail.city}`} />
                  <Info label="State" value={detail.state} />
                  <Info label="Created" value={detail.createdAt} />
                  <Info label="Views" value={String(detail.views)} />
                  <Info label="Status" value={detail.status} />
                  {detail.rejectionReason ? (
                    <Info label="Rejection" value={detail.rejectionReason} />
                  ) : null}
                </div>
              </div>
            )}

            {error ? <p className="pb-3 text-[12px] text-red-400/90">{error}</p> : null}
          </div>

          {detail && !loading ? (
            <div className="shrink-0 border-t border-border bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {editing ? (
                <ActionFooter>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className={actionButtonClass()}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        adminUpdateListing({
                          listingId: detail.id,
                          title: draft.title,
                          description: draft.description,
                          price: Number(draft.price),
                          category: draft.category,
                          condition: draft.condition,
                          state: draft.state,
                          city: draft.city,
                          area: draft.area,
                        }),
                      )
                    }
                    className={actionButtonClass("primary")}
                  >
                    Save
                  </button>
                </ActionFooter>
              ) : (
                <>
                  {detail.status === "pending" ? (
                    <ActionFooter>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "approved"), {
                            status: "approved",
                          })
                        }
                        className={actionButtonClass("primary")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setRejectOpen(true)}
                        className={actionButtonClass()}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditing(true)}
                        className={actionButtonClass()}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDeleteOpen(true)}
                        className={actionButtonClass("danger")}
                      >
                        Delete
                      </button>
                    </ActionFooter>
                  ) : null}

                  {detail.status === "approved" ? (
                    <ActionFooter>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "sold"), {
                            status: "sold",
                          })
                        }
                        className={actionButtonClass("primary")}
                      >
                        Mark Sold
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "pending"), {
                            status: "pending",
                          })
                        }
                        className={actionButtonClass()}
                      >
                        Move to Pending
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditing(true)}
                        className={actionButtonClass()}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDeleteOpen(true)}
                        className={actionButtonClass("danger")}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runAction(() => toggleFeatureListingById(detail.id))}
                        className={cn(actionButtonClass(), "col-span-2")}
                      >
                        {detail.isFeatured ? "Unfeature Listing" : "Feature Listing"}
                      </button>
                    </ActionFooter>
                  ) : null}

                  {detail.status === "sold" ? (
                    <ActionFooter>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "approved"), {
                            status: "approved",
                          })
                        }
                        className={actionButtonClass("primary")}
                      >
                        Reopen Listing
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDeleteOpen(true)}
                        className={actionButtonClass("danger")}
                      >
                        Delete
                      </button>
                    </ActionFooter>
                  ) : null}

                  {detail.status === "rejected" ? (
                    <ActionFooter>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "approved"), {
                            status: "approved",
                          })
                        }
                        className={actionButtonClass("primary")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => updateListingStatus(detail.id, "pending"), {
                            status: "pending",
                          })
                        }
                        className={actionButtonClass()}
                      >
                        Move to Pending
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDeleteOpen(true)}
                        className={cn(actionButtonClass("danger"), "col-span-2")}
                      >
                        Delete
                      </button>
                    </ActionFooter>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {rejectOpen && detail ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setRejectOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-border bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[15px] font-semibold">Reject listing</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              placeholder="Reason for rejection"
              className="mt-3 w-full rounded-[12px] border border-border bg-background px-3 py-2 text-[13px] outline-none"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="h-11 rounded-full border border-border px-3 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !rejectReason.trim()}
                        onClick={() =>
                          runAction(
                            () =>
                              updateListingStatus(detail.id, "rejected", {
                                rejectionReason: rejectReason,
                              }),
                            { status: "rejected" },
                          )
                        }
                className="h-11 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-70"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={deleteOpen}
        title="Delete this listing permanently?"
        description="This removes the listing and its images. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          runAction(() => deleteListingById(detail!.id), { removed: true })
        }
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
