"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createCommunityPost } from "@/app/actions/community";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { COMMUNITY_POST_CHANNELS } from "@/lib/community/channels";
import { uploadCommunityPhoto } from "@/lib/community/upload";
import type { CommunityPostChannelSlug } from "@/lib/types/community";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

const MAX_BODY_LENGTH = 4000;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 3;

export function CommunityCreatePost({
  isAuthenticated,
  defaultChannel,
  returnPath,
  open,
  onOpenChange,
}: {
  isAuthenticated: boolean;
  defaultChannel?: CommunityPostChannelSlug;
  returnPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<CommunityPostChannelSlug>(
    defaultChannel ?? COMMUNITY_POST_CHANNELS[0]!.slug,
  );
    const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      // Fresh composer every time the sheet opens — no stale body, photos or
      // preview URLs should carry over between opens (iPhone/Android alike).
      setError("");
      setBody("");
      setPhotos([]);
      setPreviewUrls([]);
      setChannel(defaultChannel ?? COMMUNITY_POST_CHANNELS[0]!.slug);
    }
  }, [open, defaultChannel]);

  useEffect(() => {
    if (defaultChannel && COMMUNITY_POST_CHANNELS.some((c) => c.slug === defaultChannel)) {
      setChannel(defaultChannel);
    }
  }, [defaultChannel]);

    useEffect(() => {
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  const loginHref = useMemo(() => buildAuthHref("login", returnPath), [returnPath]);

    function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    const room = MAX_IMAGES - photos.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }
    const next: File[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setError("Choose image files (JPG, PNG, WebP).");
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError("Each photo must be under 8 MB.");
        return;
      }
      next.push(file);
    }
    setError("");
    setPhotos((prev) => [...prev, ...next]);
    setPreviewUrls((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
    event.target.value = "";
  }

    function removePhoto(index: number) {
    const url = previewUrls[index];
    if (url) {
      URL.revokeObjectURL(url);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    startTransition(async () => {
            const urls: string[] = [];
      try {
        for (const file of photos) {
          urls.push(await uploadCommunityPhoto(file));
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
        return;
      }

      const result = await createCommunityPost(channel, body, urls.length ? urls : null);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setBody("");
            setPhotos([]);
      setPreviewUrls([]);
      onOpenChange(false);
      if (result.postId) {
        router.push(`/community/${result.postId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        if (!pending) {
          onOpenChange(false);
        }
      }}
      title="Create a post"
      scrollKey={channel}
    >
      <form onSubmit={onSubmit} className="space-y-3 pt-1">
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-muted">Channel</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMUNITY_POST_CHANNELS.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setChannel(item.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition duration-app",
                  channel === item.slug
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/30 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={MAX_BODY_LENGTH}
          placeholder="Share business news, opportunities, gist or ask the community…"
          className="w-full resize-none rounded-[12px] border border-border bg-background px-3 py-2.5 text-[16px] leading-relaxed outline-none focus:border-primary/40 sm:text-[14px]"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted">
            {body.length}/{MAX_BODY_LENGTH}
          </p>
          <input
            ref={fileInputRef}
                        type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFile}
          />
                    {previewUrls.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {previewUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="relative block size-7 shrink-0 overflow-hidden rounded-md border border-border"
                >
                  <Image
                    src={url}
                    alt={`Photo ${i + 1} preview`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <span className="absolute inset-0 rounded-md bg-black/35" />
                  <X size={10} className="absolute top-0.5 right-0.5 text-white" />
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending || photos.length >= MAX_IMAGES}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-muted transition duration-app hover:border-primary/35 hover:text-primary disabled:opacity-50"
          >
            <ImagePlus size={14} strokeWidth={2.2} />
            Add photo ({photos.length}/{MAX_IMAGES})
          </button>
        </div>

        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition duration-app hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Posting…
            </>
          ) : (
            "Post to Community"
          )}
        </button>
      </form>
    </BottomSheet>
  );
}