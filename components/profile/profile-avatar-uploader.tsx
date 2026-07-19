"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadProfileAvatar } from "@/app/actions/profile-avatar";
import { AvatarLightbox } from "@/components/profile/avatar-lightbox";
import { cn } from "@/lib/utils/cn";

export function ProfileAvatarUploader({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const initial = (displayName || "A").slice(0, 1).toUpperCase();

  useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl]);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("avatar", file);
      const result = await uploadProfileAvatar(formData);
      if (!result.ok) {
        setError(result.error);
        setPreview(avatarUrl);
        return;
      }
      setPreview(result.avatarUrl);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="relative size-16 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (preview) setLightboxOpen(true);
          }}
          disabled={!preview}
          className={cn(
            "grid size-16 place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-neutral-100 text-[1.1rem] font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
            preview ? "cursor-zoom-in" : "cursor-default",
            pending && "opacity-60",
          )}
          aria-label={preview ? "View profile photo" : "No profile photo yet"}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="absolute inset-x-0 bottom-0 flex justify-center rounded-b-full bg-black/50 py-0.5"
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          <Camera size={12} className="text-white" />
        </button>
      </div>
      {error ? <p className="max-w-[10rem] text-[11px] text-red-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
      <AvatarLightbox
        open={lightboxOpen}
        src={preview}
        alt={`${displayName} profile photo`}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
