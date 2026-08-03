import { SavedPageContent } from "@/components/saved/saved-page-content";
import { createClient } from "@/lib/supabase/server";
import { BRAND_NAME } from "@/lib/constants/brand";

export const metadata = {
  title: "Saved Listings",
  description: `View your saved listings on ${BRAND_NAME}. Keep track of items you're interested in.`,
  keywords: ["saved", "favorites", "bookmarks", "listings", "watchlist"],
  alternates: {
    canonical: "/saved",
  },
};

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SavedPageContent isAuthenticated={Boolean(user)} />;
}
