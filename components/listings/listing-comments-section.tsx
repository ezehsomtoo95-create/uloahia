"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteListingComment,
  postListingComment,
  postListingCommentReply,
  updateListingComment,
} from "@/app/actions/listing-comments";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";
import { ReportButton, ReportSheet } from "@/components/safety/report-sheet";

export type ListingCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  parentId: string | null;
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const loginHref = buildAuthHref("login", `/listing/${listingId}`);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // Deep-link support for notification/email links (/listing/{id}?comment={id}).
  useEffect(() => {
    const commentId = new URLSearchParams(window.location.search).get("comment");
    if (!commentId || !comments.some((c) => c.id === commentId)) {
      return;
    }
    setHighlightId(commentId);
    window.setTimeout(() => setHighlightId(null), 6000);
    requestAnimationFrame(() => {
      document
        .getElementById(`listing-comment-${commentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function startReply(comment: ListingCommentItem) {
    setError("");
    setActionError("");
    setReplyToId(comment.id);
    setReplyBody("");
  }

  function cancelReply() {
    setReplyToId(null);
    setReplyBody("");
  }

  // Replies attach to the exact comment that was clicked — even if that
  // comment is itself a reply deeper in the thread.
  function submitReply(event: FormEvent) {
    event.preventDefault();

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    const parentId = replyToId;
    if (!parentId || !replyBody.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await postListingCommentReply(listingId, parentId, replyBody);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelReply();
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
      if (replyToId === commentId) {
        cancelReply();
      }
      router.refresh();
    });
  }

  // --- Threading ------------------------------------------------------------
  // The page passes ALL comments flat; we rebuild the tree locally so replies
  // render nested under the exact comment they respond to.

  const childrenByParent = new Map<string, ListingCommentItem[]>();
  for (const comment of comments) {
    if (!comment.parentId) continue;
    const bucket = childrenByParent.get(comment.parentId) ?? [];
    bucket.push(comment);
    childrenByParent.set(comment.parentId, bucket);
  }
  for (const bucket of childrenByParent.values()) {
    bucket.reverse(); // show oldest-first within each thread
  }

  const commentById = new Map(comments.map((comment) => [comment.id, comment]));

  const topLevelComments = comments.filter((c) => c.parentId === null);

  function collectThread(root: ListingCommentItem): ListingCommentItem[] {
    const out: ListingCommentItem[] = [];
    const queue = [...(childrenByParent.get(root.id) ?? [])];
    while (queue.length > 0) {
      const next = queue.shift()!;
      out.push(next);
      queue.push(...(childrenByParent.get(next.id) ?? []));
    }
    return out;
  }

  function renderReplyForm(replyingToName: string) {
    return (
      <form onSubmit={submitReply} className="mt-2 space-y-2">
        <textarea
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={`Reply to ${replyingToName}…`}
          autoFocus
          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted">{replyBody.length}/1000</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelReply}
              className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[11px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !replyBody.trim()}
              className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Replying…" : "Send reply"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <>
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
        {topLevelComments.length === 0 ? (
          <li className="text-[13px] text-muted">No comments yet. Be the first to ask.</li>
        ) : (
          topLevelComments.map((comment) => {
            const isOwner = Boolean(currentUserId && comment.authorId === currentUserId);
            const isEditing = editingId === comment.id;
            const threadReplies = collectThread(comment);

            return (
              <li
                key={comment.id}
                id={`listing-comment-${comment.id}`}
                className={cn(
                  "rounded-[12px] border bg-surface px-3 py-2.5 transition-colors duration-app",
                  highlightId === comment.id
                    ? "border-primary/60 bg-primary/[0.05]"
                    : "border-border/80",
                )}
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

                    <div className="mt-1.5 flex items-center gap-3">
                      {replyToId !== comment.id ? (
                        <button
                          type="button"
                          onClick={() => startReply(comment)}
                          className="text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                        >
                          Reply
                        </button>
                      ) : null}
                      <ReportButton onClick={() => setReportTargetId(comment.id)} />
                      {threadReplies.length > 0 ? (
                        <span className="text-[11px] text-muted">
                          {threadReplies.length}{" "}
                          {threadReplies.length === 1 ? "reply" : "replies"}
                        </span>
                      ) : null}
                    </div>

                    {replyToId === comment.id
                      ? renderReplyForm(comment.authorName)
                      : null}

                    {threadReplies.length > 0 ? (
                      <ul className="mt-3 space-y-2.5 border-l-2 border-border/70 pl-3">
                        {threadReplies.map((reply) => {
                          const isReplyOwner = Boolean(
                            currentUserId && reply.authorId === currentUserId,
                          );
                          const parentAuthor = reply.parentId
                            ? commentById.get(reply.parentId)?.authorName ?? null
                            : null;
                          const isEditingReply = editingId === reply.id;

                          return (
                            <li
                              key={reply.id}
                              id={`listing-comment-${reply.id}`}
                              className={cn(
                                "rounded-[10px] border bg-background px-2.5 py-2 transition-colors duration-app",
                                highlightId === reply.id
                                  ? "border-primary/60"
                                  : "border-border/70",
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                  {reply.authorAvatarUrl ? (
                                    <LazyAvatar
                                      src={reply.authorAvatarUrl}
                                      size={24}
                                      className="size-full rounded-full"
                                    />
                                  ) : (
                                    reply.authorName.slice(0, 1).toUpperCase()
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-[12px] font-semibold text-neutral-950 dark:text-neutral-50">
                                        {reply.authorName}
                                      </p>
                                      <p className="text-[11px] text-muted">
                                        {reply.createdAt}
                                      </p>
                                    </div>
                                    {isReplyOwner && !isEditingReply ? (
                                      <div className="flex shrink-0 items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => startEdit(reply)}
                                          className="text-[11px] font-semibold text-primary"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeComment(reply.id)}
                                          disabled={pending}
                                          className="text-[11px] font-semibold text-red-600"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>

                                  {isEditingReply ? (
                                    <div className="mt-2 space-y-2">
                                      <textarea
                                        value={editBody}
                                        onChange={(event) =>
                                          setEditBody(event.target.value)
                                        }
                                        rows={2}
                                        maxLength={1000}
                                        className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={pending || !editBody.trim()}
                                          onClick={() => saveEdit(reply.id)}
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
                                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                                      {parentAuthor ? (
                                        <span className="mr-1 font-semibold text-primary">
                                          @{parentAuthor}
                                        </span>
                                      ) : null}
                                      {reply.body}
                                    </p>
                                  )}

                                  <div className="mt-1 flex items-center gap-3">
                                    {replyToId !== reply.id ? (
                                      <button
                                        type="button"
                                        onClick={() => startReply(reply)}
                                        className="text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                                      >
                                        Reply
                                      </button>
                                    ) : null}
                                    <ReportButton onClick={() => setReportTargetId(reply.id)} />
                                  </div>

                                  {replyToId === reply.id
                                    ? renderReplyForm(reply.authorName)
                                    : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>

    <ReportSheet
      contentType="listing_comment"
      contentId={reportTargetId ?? ""}
      open={reportTargetId !== null}
      onClose={() => setReportTargetId(null)}
      isAuthenticated={isAuthenticated}
    />
    </>
  );
}