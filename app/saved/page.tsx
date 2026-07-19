import { SavedPageContent } from "@/components/saved/saved-page-content";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SavedPageContent isAuthenticated={Boolean(user)} />;
}
