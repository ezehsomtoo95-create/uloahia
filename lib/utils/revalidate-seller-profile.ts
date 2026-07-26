import { revalidatePath } from "next/cache";
import { shopPathForUsername } from "@/lib/utils/username";

/**
 * After profiles.username / phone / avatar / verification changes, bust every
 * marketplace surface that joins seller identity from profiles via seller_id.
 */
export function revalidateSellerProfileSurfaces(
  userId: string,
  options?: {
    previousUsername?: string | null;
    nextUsername?: string | null;
  },
) {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/saved");
  revalidatePath("/messages");
  revalidatePath("/my-listings");
  revalidatePath("/profile");
  revalidatePath("/profile/complete");
  revalidatePath(`/store/${userId}`);

  const previous = options?.previousUsername?.trim();
  const next = options?.nextUsername?.trim();

  if (previous) {
    revalidatePath(shopPathForUsername(previous));
  }
  if (next && next !== previous) {
    revalidatePath(shopPathForUsername(next));
  }

  // Listing detail pages are dynamic; layout revalidation covers nested RSC trees.
  revalidatePath("/listing", "layout");
  revalidatePath("/shop", "layout");
  revalidatePath("/messages", "layout");
  revalidatePath("/categories", "layout");
}
