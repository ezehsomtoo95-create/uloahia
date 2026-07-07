"use server";

import { supabaseAdmin } from "@/lib/supabase/service";
import { isValidE164Phone, normalizeNigerianPhone } from "@/lib/utils/phone";

/** Returns whether a marketplace account exists for the given phone number. */
export async function phoneAccountExists(rawPhone: string): Promise<boolean> {
  const normalizedPhone = normalizeNigerianPhone(rawPhone);

  if (!normalizedPhone || !isValidE164Phone(normalizedPhone)) {
    return false;
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("auth_phone_account_exists", {
    input_phone: normalizedPhone,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
