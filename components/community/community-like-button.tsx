"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleCommunityPostLike } from "@/app/actions/community";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

export function CommunityLikeButton({
  postId,
  likedByMe,
  likeCount,
  isAuthenticated,
  returnPath,
}: {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
  isAuthenticated: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError("");

    if (!isAuthenticated) {
      router.push(buildAuthHref("login", returnPath));
      return;
    }

    startTransition(async () => {
      const result = await toggleCommunityPostLike(postId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={likedByMe ? "Unlike this post" : "Like this post"}
        aria-pressed={likedByMe}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-[12px] font-semibold transition duration-app active:scale-[0.98] disabled:opacity-60",
          likedByMe
            ? "border-primary/35 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted hover:border-primary/35 hover:text-primary",
        )}
      >
        <Heart
          size={15}
          strokeWidth={2.2}
          className={cn(likedByMe && "fill-current")}
        />
        {likeCount}
      </button>
      {error ? <span className="mt-1 text-[11px] text-red-600">{error}</span> : null}
    </span>
  );
}