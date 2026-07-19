"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteListingComment,
  postListingComment,
  updateListingComment,
} from "@/app/actions/listing-comments";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export type ListingCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export function ListingCommentsSection({
  listingId,
  comments,
  isAuthenticated,
  currentUserId = null,
}: {
  listingId: string;
  comments: ListingCommentItem[];
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [actionError, setActionError] = useState("");
  const loginHref = buildAuthHref("login", `/listing/${listingId}`);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    startTransition(async () => {
      const result = await postListingComment(listingId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function startEdit(comment: ListingCommentItem) {
    setActionError("");
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
    setActionError("");
  }

  function saveEdit(commentId: string) {
    setActionError("");
    startTransition(async () => {
      const result = await updateListingComment(listingId, commentId, editBody);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function removeComment(commentId: string) {
    setActionError("");
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteListingComment(listingId, commentId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (editingId === commentId) {
        cancelEdit();
      }
      router.refresh();
    });
  }

  return (
    <section className="market-pdp-comments mt-6 border-t border-border pt-5">
      <h2 className="market-pdp-section-label">Discussion</h2>
      <p className="mt-1 text-[13px] text-muted">
        Comments are public. Ask questions about this listing and keep it respectful.
      </p>

      {isAuthenticated ? (
        <form onSubmit={onSubmit} className="mt-3 space-y-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Write a comment…"
            className="w-full rounded-[12px] border border-border bg-background px-3 py-2.5 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">{body.length}/1000</p>
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className={cn(
                "inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground disabled:opacity-50",
              )}
            >
              {pending ? "Posting…" : "Post comment"}
            </button>
          </div>
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
        </form>
      ) : (
        <div className="mt-3 rounded-[12px] border border-dashed border-border bg-surface/60 px-3.5 py-3">
          <p className="text-[13px] text-muted">
            Sign in to join the discussion.
          </p>
          <Link
            href={loginHref}
            className="mt-2 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
          >
            Sign in to comment
          </Link>
        </div>
      )}

      {actionError ? <p className="mt-3 text-[12px] text-red-600">{actionError}</p> : null}

      <ul className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <li className="text-[13px] text-muted">No comments yet. Be the first to ask.</li>
        ) : (
          comments.map((comment) => {
            const isOwner = Boolean(currentUserId && comment.authorId === currentUserId);
            const isEditing = editingId === comment.id;

            return (
              <li
                key={comment.id}
                className="rounded-[12px] border border-border/80 bg-surface px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {comment.authorAvatarUrl ? (
                      <LazyAvatar
                        src={comment.authorAvatarUrl}
                        size={28}
                        className="size-full rounded-full"
                      />
                    ) : (
                      comment.authorName.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-neutral-950 dark:text-neutral-50">
                          {comment.authorName}
                        </p>
                        <p className="text-[11px] text-muted">{comment.createdAt}</p>
                      </div>
                      {isOwner && !isEditing ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            className="text-[11px] font-semibold text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeComment(comment.id)}
                            disabled={pending}
                            className="text-[11px] font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                          rows={3}
                          maxLength={1000}
                          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pending || !editBody.trim()}
                            onClick={() => saveEdit(comment.id)}
                            className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[11px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                        {comment.body}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
