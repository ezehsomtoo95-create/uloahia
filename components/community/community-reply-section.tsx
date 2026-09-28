"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addCommunityReply, deleteCommunityReply } from "@/app/actions/community";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { communityProfileHref } from "@/lib/community/profile";
import type { CommunityReply } from "@/lib/types/community";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { getSellerInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ReportButton, ReportSheet } from "@/components/safety/report-sheet";

export function CommunityReplySection({
  postId,
  replies,
  isAuthenticated,
  currentUserId = null,
}: {
  postId: string;
  replies: CommunityReply[];
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const loginHref = buildAuthHref("login", `/community/${postId}`);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // Deep-link support for notification/email links (/community/{id}?reply={id}).
  useEffect(() => {
    const targetId = new URLSearchParams(window.location.search).get("reply");
    if (!targetId || !replies.some((r) => r.id === targetId)) {
      return;
    }
    setHighlightId(targetId);
    window.setTimeout(() => setHighlightId(null), 6000);
    requestAnimationFrame(() => {
      document
        .getElementById(`community-reply-${targetId}`)
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
      const result = await addCommunityReply(postId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function startThreadReply(reply: CommunityReply) {
    setError("");
    setActionError("");
    setReplyToId(reply.id);
    setReplyBody("");
  }

  function cancelThreadReply() {
    setReplyToId(null);
    setReplyBody("");
  }

  // Attaches to the exact reply that was clicked (nested replies stay flat
  // under their root thread, with an @mention of the person replied to).
  function submitThreadReply(event: FormEvent) {
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
      const result = await addCommunityReply(postId, replyBody, parentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelThreadReply();
      router.refresh();
    });
  }

  // --- Threading -------------------------------------------------------------
  const childrenByParent = new Map<string, CommunityReply[]>();
  for (const reply of replies) {
    if (!reply.parentId) continue;
    const bucket = childrenByParent.get(reply.parentId) ?? [];
    bucket.push(reply);
    childrenByParent.set(reply.parentId, bucket);
  }
  for (const bucket of childrenByParent.values()) {
    bucket.reverse(); // oldest-first inside each thread
  }

  const replyById = new Map(replies.map((reply) => [reply.id, reply]));
  const topLevelReplies = replies.filter((r) => r.parentId === null);

  function collectThread(root: CommunityReply): CommunityReply[] {
    const out: CommunityReply[] = [];
    const queue = [...(childrenByParent.get(root.id) ?? [])];
    while (queue.length > 0) {
      const next = queue.shift()!;
      out.push(next);
      queue.push(...(childrenByParent.get(next.id) ?? []));
    }
    return out;
  }

  function renderThreadReplyForm(replyingToName: string) {
    return (
      <form onSubmit={submitThreadReply} className="mt-2 space-y-2">
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
              onClick={cancelThreadReply}
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

  function removeReply(reply: CommunityReply) {
    setActionError("");
    if (!window.confirm("Delete this reply?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCommunityReply(postId, reply.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <section className="mt-6 border-t border-border pt-5">
      <h2 className="market-pdp-section-label">Replies</h2>
      <p className="mt-1 text-[13px] text-muted">
        Replies are public. Join the conversation and keep it respectful.
      </p>

      {isAuthenticated ? (
        <form onSubmit={onSubmit} className="mt-3 space-y-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Write a reply…"
            className="w-full rounded-[12px] border border-border bg-background px-3 py-2.5 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[13px]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">{body.length}/1000</p>
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Replying…" : "Reply"}
            </button>
          </div>
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
        </form>
      ) : (
        <div className="mt-3 rounded-[12px] border border-dashed border-border bg-surface/60 px-3.5 py-3">
          <p className="text-[13px] text-muted">Sign in to join the conversation.</p>
          <Link
            href={loginHref}
            className="mt-2 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
          >
            Sign in to reply
          </Link>
        </div>
      )}

      {actionError ? <p className="mt-3 text-[12px] text-red-600">{actionError}</p> : null}

      <ul className="mt-4 space-y-3">
        {topLevelReplies.length === 0 ? (
          <li className="text-[13px] text-muted">No replies yet. Be the first to reply.</li>
        ) : (
          topLevelReplies.map((reply) => {
            const threadChildren = collectThread(reply);
            const profileHref = communityProfileHref(reply.authorId, null);
            const isOwner = Boolean(currentUserId && reply.authorId === currentUserId);
            return (
              <li
                key={reply.id}
                id={`community-reply-${reply.id}`}
                className={cn(
                  "rounded-[12px] border bg-surface px-3 py-2.5 transition-colors duration-app",
                  highlightId === reply.id
                    ? "border-primary/60 bg-primary/[0.05]"
                    : "border-border/80",
                )}
              >
                <div className="flex items-start gap-2">
                  <Link href={profileHref} className="shrink-0 no-underline">
                    <LazyAvatar
                      src={reply.authorAvatarUrl}
                      size={28}
                      className="size-7 rounded-full"
                      fallback={
                        <span className="text-[10px] font-semibold text-muted">
                          {getSellerInitials(reply.authorName)}
                        </span>
                      }
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-neutral-950 dark:text-neutral-50">
                          {reply.authorName}
                        </p>
                        <p className="text-[11px] text-muted">{reply.createdAt}</p>
                      </div>
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => removeReply(reply)}
                          disabled={pending}
                          className="shrink-0 cursor-pointer text-[11px] font-semibold text-red-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                      {reply.body}
                    </p>

                    <div className="mt-1.5 flex items-center gap-3">
                      {replyToId !== reply.id ? (
                        <button
                          type="button"
                          onClick={() => startThreadReply(reply)}
                          className="cursor-pointer text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                        >
                          Reply
                        </button>
                      ) : null}
                      <ReportButton onClick={() => setReportTargetId(reply.id)} />
                      {threadChildren.length > 0 ? (
                        <span className="text-[11px] text-muted">
                          {threadChildren.length}{" "}
                          {threadChildren.length === 1 ? "reply" : "replies"}
                        </span>
                      ) : null}
                    </div>

                    {replyToId === reply.id
                      ? renderThreadReplyForm(reply.authorName)
                      : null}

                    {threadChildren.length > 0 ? (
                      <ul className="mt-3 space-y-2.5 border-l-2 border-border/70 pl-3">
                        {threadChildren.map((child) => {
                          const childProfileHref = communityProfileHref(
                            child.authorId,
                            null,
                          );
                          const childOwner = Boolean(
                            currentUserId && child.authorId === currentUserId,
                          );
                          const mentionedName = child.parentId
                            ? replyById.get(child.parentId)?.authorName ?? null
                            : null;

                          return (
                            <li
                              key={child.id}
                              id={`community-reply-${child.id}`}
                              className={cn(
                                "rounded-[10px] border bg-background px-2.5 py-2 transition-colors duration-app",
                                highlightId === child.id
                                  ? "border-primary/60"
                                  : "border-border/70",
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <Link
                                  href={childProfileHref}
                                  className="shrink-0 no-underline"
                                >
                                  <LazyAvatar
                                    src={child.authorAvatarUrl}
                                    size={24}
                                    className="size-6 rounded-full"
                                    fallback={
                                      <span className="text-[9px] font-semibold text-muted">
                                        {getSellerInitials(child.authorName)}
                                      </span>
                                    }
                                  />
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-[12px] font-semibold text-neutral-950 dark:text-neutral-50">
                                        {child.authorName}
                                      </p>
                                      <p className="text-[11px] text-muted">
                                        {child.createdAt}
                                      </p>
                                    </div>
                                    {childOwner ? (
                                      <button
                                        type="button"
                                        onClick={() => removeReply(child)}
                                        disabled={pending}
                                        className="shrink-0 cursor-pointer text-[11px] font-semibold text-red-600 disabled:opacity-50"
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                                    {mentionedName ? (
                                      <span className="mr-1 font-semibold text-primary">
                                        @{mentionedName}
                                      </span>
                                    ) : null}
                                    {child.body}
                                  </p>
                                  <div className="mt-1 flex items-center gap-3">
                                    {replyToId !== child.id ? (
                                      <button
                                        type="button"
                                        onClick={() => startThreadReply(child)}
                                        className="cursor-pointer text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                                      >
                                        Reply
                                      </button>
                                    ) : null}
                                    <ReportButton onClick={() => setReportTargetId(child.id)} />
                                  </div>
                                  {replyToId === child.id
                                    ? renderThreadReplyForm(child.authorName)
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
        contentType="community_reply"
        contentId={reportTargetId ?? ""}
        open={reportTargetId !== null}
        onClose={() => setReportTargetId(null)}
        isAuthenticated={isAuthenticated}
      />
      </>
  );
}