"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { formatZodError, listingIdSchema } from "@/lib/validation/common";

export async function getSavedListingIds() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("getSavedListingIds error", error);
      return [];
    }

    return (data ?? []).map((row) => row.listing_id);
  } catch (error) {
    console.error("getSavedListingIds error", error);
    return [];
  }
}

const toggleSavedListingSchema = z.object({
  listingId: listingIdSchema,
});

export async function toggleSavedListing(listingId: string) {
  try {
    const { listingId: validatedListingId } = toggleSavedListingSchema.parse({
      listingId,
    });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { saved: false, error: "Not authenticated" };
    }

    const { data: existing, error: existingError } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", validatedListingId)
      .maybeSingle();

    if (existingError) {
      console.error("toggleSavedListing lookup error", existingError);
      return { saved: false, error: existingError.message };
    }

    if (existing) {
      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", validatedListingId);

      if (error) {
        console.error("toggleSavedListing delete error", error);
        return { saved: true, error: error.message };
      }

      revalidatePath("/");
      revalidatePath("/browse");
      revalidatePath("/saved");
      return { saved: false };
    }

    const { error } = await supabase.from("saved_listings").insert({
      user_id: user.id,
      listing_id: validatedListingId,
    });

    if (error) {
      console.error("toggleSavedListing insert error", error);
      return { saved: false, error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath("/saved");

    return { saved: true };
  } catch (error) {
    return { saved: false, error: formatZodError(error) };
  }
}
