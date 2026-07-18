"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient, supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { shopPathForUsername, validateUsername } from "@/lib/utils/username";

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

  const { data: usernameOwner } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (usernameOwner) {
    return { ok: false, error: "That name is taken." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath(shopPathForUsername(username));
  revalidatePath(`/store/${user.id}`);
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
