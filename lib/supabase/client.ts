import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Session tokens are synced via httpOnly cookies
 * through @supabase/ssr middleware — not stored in localStorage for auth.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
