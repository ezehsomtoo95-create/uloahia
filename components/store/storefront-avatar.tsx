"use client";

import { Store } from "lucide-react";
import { AvatarLightbox } from "@/components/profile/avatar-lightbox";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function StorefrontAvatar({
  src,
  displayName,
}: {
  src: string | null;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (src) setOpen(true);
        }}
        disabled={!src}
        className={cn(
          "grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-neutral-100 dark:bg-neutral-800",
          src ? "cursor-zoom-in" : "cursor-default",
        )}
        aria-label={src ? "View profile photo" : undefined}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <Store size={28} strokeWidth={1.6} />
        )}
      </button>
      <AvatarLightbox
        open={open}
        src={src}
        alt={`${displayName} profile photo`}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
