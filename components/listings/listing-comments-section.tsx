"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postListingComment } from "@/app/actions/listing-comments";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export type ListingCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export function ListingCommentsSection({
  listingId,
  comments,
  isAuthenticated,
}: {
  listingId: string;
  comments: ListingCommentItem[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!isAuthenticated) {
      router.push(buildAuthHref("login", `/listing/${listingId}`));
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

  return (
    <section className="market-pdp-comments mt-6 border-t border-border pt-5">
      <h2 className="market-pdp-section-label">Discussion</h2>
      <p className="mt-1 text-[13px] text-muted">
        Ask questions about this listing. Keep it respectful — comments are moderated.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={isAuthenticated ? "Write a comment…" : "Sign in to join the discussion"}
          className="w-full rounded-[12px] border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-primary/40"
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

      <ul className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <li className="text-[13px] text-muted">No comments yet. Be the first to ask.</li>
        ) : (
          comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-[12px] border border-border/80 bg-surface px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
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
                  <p className="truncate text-[12px] font-semibold text-neutral-950 dark:text-neutral-50">
                    {comment.authorName}
                  </p>
                  <p className="text-[11px] text-muted">{comment.createdAt}</p>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                {comment.body}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
