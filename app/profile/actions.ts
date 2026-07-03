"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
