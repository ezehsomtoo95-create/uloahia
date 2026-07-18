"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadProfileAvatar } from "@/app/actions/profile-avatar";
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
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const initial = (displayName || "A").slice(0, 1).toUpperCase();

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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className={cn(
          "relative grid size-16 place-items-center overflow-hidden rounded-full border-2 border-emerald-600 bg-neutral-100 text-[1.1rem] font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
          pending && "opacity-60",
        )}
        aria-label="Change profile photo"
        title="Change profile photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
        <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-0.5">
          <Camera size={12} className="text-white" />
        </span>
      </button>
      {error ? <p className="max-w-[10rem] text-[11px] text-red-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
    </div>
  );
}
