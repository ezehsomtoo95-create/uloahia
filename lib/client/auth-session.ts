"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const AUTH_HYDRATION_MS = 150;

export async function getViewerSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Waits until the browser auth client has finished its first hydration pass.
 * Avoids resolving too early with a null session while cookies are still syncing.
 */
export function waitForInitialAuthSession(
  supabase: SupabaseClient,
): Promise<Session | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (session: Session | null) => {
      if (settled) {
        return;
      }

      settled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
      resolve(session);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        finish(null);
        return;
      }

      if (
        nextSession &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION")
      ) {
        finish(nextSession);
      }

      if (event === "INITIAL_SESSION" && !nextSession) {
        void supabase.auth.getSession().then(({ data: { session } }) => {
          finish(session);
        });
      }
    });

    const timeoutId = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        finish(session);
      });
    }, AUTH_HYDRATION_MS);
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
