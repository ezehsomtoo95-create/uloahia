"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import { formatSupabaseError } from "@/lib/utils/supabase-error";

function logSupabaseError(context: string, error: unknown) {
  console.error(`[saved] ${context}`, error);

  if (error && typeof error === "object") {
    const formatted = formatSupabaseError(error as {
      code?: string;
      message?: string;
      details?: string | null;
      hint?: string | null;
    });
    console.error(`[saved] ${context} (formatted)`, formatted);

    if (formatted?.code) {
      console.error(`[saved] ${context} code:`, formatted.code);
    }
    if (formatted?.message) {
      console.error(`[saved] ${context} message:`, formatted.message);
    }
    if (formatted?.details) {
      console.error(`[saved] ${context} details:`, formatted.details);
    }
    if (formatted?.hint) {
      console.error(`[saved] ${context} hint:`, formatted.hint);
    }
  }
}

function resolveSessionPhone(user: User) {
  const candidates = [
    user.phone,
    typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function isDuplicateProfileError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.includes("duplicate key") ||
    error.message?.includes("profiles_pkey") ||
    error.message?.includes("profiles_phone_key")
  );
}

async function profileExists(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logSupabaseError("profile existence check failed", error);
    return false;
  }

  return Boolean(data);
}

async function ensureViewerProfile(supabase: SupabaseClient, user: User) {
  if (await profileExists(supabase, user.id)) {
    return true;
  }

  const rawPhone = resolveSessionPhone(user);
  if (!rawPhone) {
    console.error("[saved] profile missing and no phone on session", { userId: user.id });
    return false;
  }

  const normalizedPhone = normalizeNigerianPhone(rawPhone) ?? rawPhone;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      phone: normalizedPhone,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (isDuplicateProfileError(error) && (await profileExists(supabase, user.id))) {
      return true;
    }

    logSupabaseError("profile upsert failed", error);
    return false;
  }

  return true;
}

function isDuplicateSaveError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.includes("duplicate key") ||
    error.message?.includes("saved_listings_pkey")
  );
}

export async function toggleAuthenticatedSavedListing(
  listingId: string,
  session: Session,
) {
  const supabase = createClient();
  const user = session.user;

  console.log("[saved] session", user.id);
  console.log("[saved] listing", listingId);

  try {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    const profileReady = await ensureViewerProfile(supabase, user);
    if (!profileReady) {
      return { saved: false, error: "Profile unavailable" };
    }

    const { data: existing, error: existingError } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existingError) {
      logSupabaseError("saved_listings lookup failed", existingError);
      return { saved: false, error: existingError.message, supabaseError: existingError };
    }

    if (existing) {
      const deleteResult = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (deleteResult.error) {
        logSupabaseError("saved_listings delete failed", deleteResult.error);
        return {
          saved: true,
          error: deleteResult.error.message,
          supabaseError: deleteResult.error,
        };
      }

      return { saved: false };
    }

    const insertResult = await supabase.from("saved_listings").insert({
      user_id: user.id,
      listing_id: listingId,
    });

    if (insertResult.error) {
      logSupabaseError("saved_listings insert failed", insertResult.error);

      if (isDuplicateSaveError(insertResult.error)) {
        return { saved: true };
      }

      return {
        saved: false,
        error: insertResult.error.message,
        supabaseError: insertResult.error,
      };
    }

    return { saved: true };
  } catch (error) {
    console.error("[saved] toggleAuthenticatedSavedListing unexpected error", error);
    return {
      saved: false,
      error: error instanceof Error ? error.message : "Unexpected save error",
    };
  }
}

export async function fetchAuthenticatedSavedListingIds(userId: string) {
  const supabase = createClient();

  const { data: savedRows, error } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  console.log("[saved] fetch count", savedRows?.length ?? 0);

  return { savedRows: savedRows ?? [], error };
}
