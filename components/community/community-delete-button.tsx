"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCommunityPost } from "@/app/actions/community";
import { cn } from "@/lib/utils/cn";

export function CommunityDeleteButton({
  postId,
  compact = false,
}: {
  postId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this post?")) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await deleteCommunityPost(postId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push("/community");
    });
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label="Delete post"
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-red-600 transition duration-app hover:bg-red-500/5 active:scale-[0.98] disabled:opacity-60",
          compact && "border-0 p-1",
        )}
      >
        <Trash2 size={14} strokeWidth={2.2} />
        {!compact ? "Delete" : null}
      </button>
      {!compact && error ? (
        <span className="mt-1 text-[11px] text-red-600">{error}</span>
      ) : null}
    </span>
  );
}