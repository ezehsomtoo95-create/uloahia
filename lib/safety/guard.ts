import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side safety helpers used by content-creating server actions.
 *
 * Both helpers FAIL OPEN on infrastructure errors so ordinary users are never
 * locked out because of a transient database hiccup. The heavier decisions
 * live in SQL (see supabase/migrations/0049_safety_moderation.sql).
 */

export type ContentSafetyResult =
  | { kind: "allow" }
  /** Published normally, but recorded in the admin review queue. */
  | { kind: "review"; reasonCode: string }
  | { kind: "block"; message: string };

/**
 * Rolling-window rate limit backed by public.consume_rate_limit.
 * Returns false when this action should be refused right now.
 * New (<24h old) or previously-struck accounts automatically get stricter
 * budgets inside the SQL function — call sites only pass the NORMAL budget.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  userId: string,
  actionKey: string,
  maxPerWindow: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_user_id: userId,
      p_action_key: actionKey,
      p_max: maxPerWindow,
      p_window: `${windowSeconds} seconds`,
    });
    if (error) {
      console.error("[safety] consume_rate_limit failed:", error.message);
      return true; // fail open
    }
    return data === true;
  } catch (error) {
    console.error("[safety] consume_rate_limit threw:", error);
    return true; // fail open
  }
}

/**
 * Runs automated moderation + progressive enforcement for a piece of user
 * text before publishing it. Decisions and flag events are recorded inside
 * enforce_content_safety (SECURITY DEFINER) for the admin queue.
 */
export async function runContentSafety(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  surface: string,
): Promise<ContentSafetyResult> {
  try {
    const { data, error } = await supabase.rpc("enforce_content_safety", {
      p_user: userId,
      p_text: text,
      p_surface: surface,
    });

    if (error) {
      console.error("[safety] enforce_content_safety failed:", error.message);
      return { kind: "allow" }; // fail open
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row || typeof row.decision !== "string") {
      return { kind: "allow" };
    }

    if (row.decision === "block") {
      return {
        kind: "block",
        message:
          row.message ?? "This was not sent because it looks unsafe. Edit it and try again.",
      };
    }
    if (row.decision === "review") {
      return { kind: "review", reasonCode: row.reason_code ?? "unknown" };
    }
    return { kind: "allow" };
  } catch (error) {
    console.error("[safety] enforce_content_safety threw:", error);
    return { kind: "allow" }; // fail open
  }
}