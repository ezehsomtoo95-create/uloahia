"use server";

import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { supabaseAdmin } from "@/lib/supabase/service";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import { formatZodError } from "@/lib/validation/common";
import { signupSchema } from "@/lib/validation/auth";

type SignupAvailabilityInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export async function assertSignupAvailability(
  input: SignupAvailabilityInput,
): Promise<ActionResult<{ normalizedPhone: string }>> {
  try {
    const parsed = signupSchema.parse(input);
    const normalizedPhone = normalizeNigerianPhone(parsed.phone);

    if (!normalizedPhone) {
      return actionError("Enter a valid Nigerian phone number, for example 08101234567.");
    }

    const admin = supabaseAdmin();
    const { data: phoneProfile, error: phoneError } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (phoneError) {
      return actionError("Could not validate phone number. Please try again.");
    }

    if (phoneProfile) {
      return actionError("This phone number is already linked to an account.");
    }

    const { data: users, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (!usersError) {
      const normalizedEmail = parsed.email.toLowerCase();
      const match = users.users.some(
        (user) => user.email?.toLowerCase() === normalizedEmail,
      );

      if (match) {
        return actionError("This email already has an account.");
      }
    }

    return actionSuccess({ normalizedPhone });
  } catch (error) {
    return actionError(formatZodError(error));
  }
}
