"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { formatZodError, listingIdSchema } from "@/lib/validation/common";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Login required.");
  }

  return { supabase, user };
}

export async function markListingSold(
  listingIdOrFormData: string | FormData,
): Promise<ActionResult> {
  try {
    const listingId =
      typeof listingIdOrFormData === "string"
        ? listingIdSchema.parse(listingIdOrFormData)
        : listingIdSchema.parse(String(listingIdOrFormData.get("listingId")));

    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (error) {
      return actionError(error.message);
    }

    revalidatePath("/my-listings");
    return actionSuccess();
  } catch (error) {
    return actionError(formatZodError(error));
  }
}

export async function relistListing(formData: FormData): Promise<void> {
  await relistListingWithResult(formData);
}

export async function deleteListing(formData: FormData): Promise<void> {
  await deleteListingWithResult(formData);
}

export async function relistListingWithResult(formData: FormData): Promise<ActionResult> {
  try {
    const listingId = listingIdSchema.parse(String(formData.get("listingId")));
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("listings")
      .update({ status: "pending", created_at: new Date().toISOString() })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (error) {
      return actionError(error.message);
    }

    revalidatePath("/my-listings");
    return actionSuccess();
  } catch (error) {
    return actionError(formatZodError(error));
  }
}

export async function deleteListingWithResult(formData: FormData): Promise<ActionResult> {
  try {
    const listingId = listingIdSchema.parse(String(formData.get("listingId")));
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (error) {
      return actionError(error.message);
    }

    revalidatePath("/my-listings");
    return actionSuccess();
  } catch (error) {
    return actionError(formatZodError(error));
  }
}
