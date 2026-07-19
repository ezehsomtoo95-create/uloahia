import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Phone edits live on the profile dashboard (instant save + email notify, no OTP). */
export default async function ChangePhonePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  redirect("/profile");
}
