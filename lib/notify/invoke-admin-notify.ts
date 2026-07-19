import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

type InvokeNotifyResult = { ok: true } | { ok: false; error: string };

/** Calls the admin-notify Edge Function (Resend) with x-admin-notify-secret. */
export async function invokeAdminNotify(
  type: string,
  details: Record<string, unknown>,
): Promise<InvokeNotifyResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const secret = process.env.ADMIN_NOTIFY_SECRET?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!baseUrl || !secret) {
    console.warn("[notify] ADMIN_NOTIFY_SECRET or SUPABASE_URL missing; skip email", type);
    return { ok: false, error: "Email notify is not configured." };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-admin-notify-secret": secret,
    };

    // Supabase Functions gateway expects a JWT/apikey; app auth uses x-admin-notify-secret.
    if (anonKey) {
      headers.Authorization = `Bearer ${anonKey}`;
      headers.apikey = anonKey;
    }

    const response = await fetch(`${baseUrl}/functions/v1/admin-notify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type, details }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[notify] admin-notify failed", response.status, body);
      return { ok: false, error: `Notify failed (${response.status}).` };
    }

    return { ok: true };
  } catch (error) {
    console.error("[notify] admin-notify error", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Notify failed.",
    };
  }
}

export async function createSecurityNotification(input: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const admin = createServiceClient();
    await admin.rpc("create_notification", {
      target_user_id: input.userId,
      notification_type: "security",
      notification_title: input.title,
      notification_body: input.body,
      notification_link: input.link ?? "/profile",
      notification_data: {},
    });
  } catch (error) {
    console.error("[notify] create_notification failed", error);
  }
}
