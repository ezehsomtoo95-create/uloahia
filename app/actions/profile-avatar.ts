"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateSellerProfileSurfaces } from "@/lib/utils/revalidate-seller-profile";

type UploadResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProfileAvatar(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to update your photo." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Use JPG, PNG, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be under 3MB." };
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  revalidateSellerProfileSurfaces(user.id);
  return { ok: true, avatarUrl };
}
