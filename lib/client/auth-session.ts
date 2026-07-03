"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export async function getViewerSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function waitForInitialAuthSession(
  supabase: SupabaseClient,
): Promise<Session | null> {
  return supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      return session;
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (nextSession: Session | null) => {
        if (settled) {
          return;
        }

        settled = true;
        subscription.unsubscribe();
        resolve(nextSession);
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          finish(nextSession);
        }
      });
    });
  });
}

export async function waitForAuthReady(): Promise<Session | null> {
  const supabase = createClient();
  return waitForInitialAuthSession(supabase);
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await waitForAuthReady();
  return session?.user?.id ?? null;
}
