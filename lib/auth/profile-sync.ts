import type { SupabaseClient } from "@supabase/supabase-js";

type SyncProfileInput = {
  userId: string;
  phone: string;
  fullName?: string | null;
  markPasswordSet?: boolean;
};

/** Keeps public.profiles in sync after auth events (login, signup, password setup). */
export async function syncAuthProfile(
  supabase: SupabaseClient,
  input: SyncProfileInput,
) {
  const payload: Record<string, string | null> = {
    id: input.userId,
    phone: input.phone,
    full_name: input.fullName?.trim() || null,
  };

  if (input.markPasswordSet) {
    payload.password_set_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    throw new Error(error.message);
  }
}
