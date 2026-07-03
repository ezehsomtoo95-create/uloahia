"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatZodError, listingIdSchema, visitorIdSchema } from "@/lib/validation/common";

const recordListingViewSchema = z.object({
  listingId: listingIdSchema,
  visitorId: visitorIdSchema,
  isGuest: z.boolean(),
});

export async function recordListingView(
  listingId: string,
  visitorId: string,
  isGuest: boolean,
) {
  try {
    const input = recordListingViewSchema.parse({ listingId, visitorId, isGuest });

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_listing_view", {
      listing_uuid: input.listingId,
      p_visitor_id: input.visitorId,
      p_is_guest: input.isGuest,
    });

    if (error) {
      console.error("record listing view error", { listingId: input.listingId, error });
      return { recorded: false as const, error: error.message };
    }

    revalidatePath(`/listing/${input.listingId}`);
    return { recorded: true as const };
  } catch (error) {
    return { recorded: false as const, error: formatZodError(error) };
  }
}
