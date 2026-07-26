"use server";

import { redirect } from "next/navigation";
import {
  createSecurityNotification,
  invokeAdminNotify,
} from "@/lib/notify/invoke-admin-notify";
import { createServiceClient, supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  formatDisplayPhone,
  isValidE164Phone,
  normalizeNigerianPhone,
} from "@/lib/utils/phone";
import { revalidateSellerProfileSurfaces } from "@/lib/utils/revalidate-seller-profile";
import { validateUsername } from "@/lib/utils/username";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type UpdateUsernameResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export async function updateProfileUsername(
  usernameInput: string,
): Promise<UpdateUsernameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to update your username." };
  }

  const validated = validateUsername(usernameInput);
  if (!validated.ok) {
    return validated;
  }
  const { username } = validated;

  const [{ data: currentProfile }, { data: usernameOwner }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabaseAdmin()
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", user.id)
      .maybeSingle(),
  ]);

  if (usernameOwner) {
    return { ok: false, error: "That name is taken." };
  }

  const previousUsername = currentProfile?.username ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSellerProfileSurfaces(user.id, {
    previousUsername,
    nextUsername: username,
  });
  return { ok: true, username };
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteOwnAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in to delete your profile." };
  }

  try {
    const service = createServiceClient();
    const { error: authError } = await service.auth.admin.deleteUser(user.id);

    if (authError) {
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) {
        return { ok: false, error: authError.message };
      }
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Account deletion is unavailable right now.",
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}

export type PhoneChangeActionResult =
  | { ok: true; phone?: string }
  | { ok: false; error: string };

/**
 * Instant phone update from the profile dashboard (no OTP / verify step).
 * Writes profiles.phone, syncs auth phone, and emails a short notice.
 */
export async function updateProfilePhone(
  newPhoneInput: string,
): Promise<PhoneChangeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to change your phone number." };
  }

  const normalized =
    normalizeNigerianPhone(newPhoneInput) ??
    (isValidE164Phone(newPhoneInput.trim()) ? newPhoneInput.trim() : null);

  if (!normalized || !isValidE164Phone(normalized)) {
    return { ok: false, error: "Enter a valid Nigerian phone number." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  if (normalizeNigerianPhone(profile?.phone ?? "") === normalized) {
    return { ok: false, error: "Enter a different phone number." };
  }

  const { data: taken } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("phone", normalized)
    .neq("id", user.id)
    .maybeSingle();

  if (taken) {
    return { ok: false, error: "That phone number is already in use." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalized,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  try {
    const service = createServiceClient();
    const { error: authError } = await service.auth.admin.updateUserById(user.id, {
      phone: normalized,
      phone_confirm: true,
    });
    if (authError) {
      console.error("[profile] auth phone sync failed", authError.message);
    }
  } catch (error) {
    console.error("[profile] auth phone sync failed", error);
  }

  const displayPhone = formatDisplayPhone(normalized);

  await createSecurityNotification({
    userId: user.id,
    title: "Phone updated",
    body: "Your phone number has been updated.",
    link: "/profile",
  });

  if (user.email) {
    await invokeAdminNotify("phone_change_security", {
      to_email: user.email,
      new_phone: displayPhone,
      user_id: user.id,
    });
  }

  revalidateSellerProfileSurfaces(user.id);
  return { ok: true, phone: displayPhone };
}

/** Clears phone verification while a change is in progress (OTP pending). */
export async function beginPhoneChange(): Promise<PhoneChangeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to change your phone number." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone_verified_at: null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSellerProfileSurfaces(user.id);
  return { ok: true };
}

/**
 * After auth phone_change OTP succeeds: sync profiles.phone, mark verified,
 * and send a security alert to the user's email.
 */
export async function finalizePhoneChange(
  newPhoneInput: string,
): Promise<PhoneChangeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to change your phone number." };
  }

  const normalized =
    normalizeNigerianPhone(newPhoneInput) ??
    (isValidE164Phone(newPhoneInput.trim()) ? newPhoneInput.trim() : null);

  if (!normalized || !isValidE164Phone(normalized)) {
    return { ok: false, error: "Enter a valid Nigerian phone number." };
  }

  const authPhone = user.phone
    ? user.phone.startsWith("+")
      ? user.phone
      : `+${user.phone}`
    : null;

  if (authPhone && normalizeNigerianPhone(authPhone) !== normalized) {
    return {
      ok: false,
      error: "Verify the new number with OTP before saving.",
    };
  }

  const { data: taken } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("phone", normalized)
    .neq("id", user.id)
    .maybeSingle();

  if (taken) {
    return { ok: false, error: "That phone number is already in use." };
  }

  const verifiedAt = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalized,
      phone_verified_at: verifiedAt,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const displayPhone = formatDisplayPhone(normalized);
  const alertBody = "Your phone number has been updated.";

  await createSecurityNotification({
    userId: user.id,
    title: "Phone updated",
    body: alertBody,
    link: "/profile",
  });

  if (user.email) {
    await invokeAdminNotify("phone_change_security", {
      to_email: user.email,
      new_phone: displayPhone,
      user_id: user.id,
    });
  }

  revalidateSellerProfileSurfaces(user.id);
  return { ok: true };
}
