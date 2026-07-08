import { Resend } from "npm:resend@4.0.0";

const ADMIN_EMAIL = "ezehsomtoo95@gmail.com";
const FROM_EMAIL = "info@ahiaulo.ng";
const APP_NAME = "AhiaUlo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyType = "new_user" | "new_listing" | string;

type NotifyPayload = {
  type?: NotifyType;
  details?: unknown;
};

type SupabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function maskSecret(value: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "***";
  }

  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

function isAuthorized(req: Request): { ok: true } | { ok: false; error: string } {
  const notifySecret = Deno.env.get("ADMIN_NOTIFY_SECRET");
  if (!notifySecret) {
    console.error("admin-notify auth error:", "ADMIN_NOTIFY_SECRET is not configured");
    return {
      ok: false,
      error: "ADMIN_NOTIFY_SECRET is not configured for this function.",
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    // Supabase Dashboard "Test" button does not include Authorization header.
    const ua = (req.headers.get("User-Agent") ?? "").toLowerCase();
    const clientInfo = (req.headers.get("x-client-info") ?? "").toLowerCase();
    const looksLikeDashboardTest =
      ua.includes("supabase") || clientInfo.includes("supabase") || clientInfo.includes("dashboard");

    if (looksLikeDashboardTest) {
      console.error(
        "admin-notify auth bypass:",
        "No Authorization header detected; allowing through for Supabase dashboard test.",
      );
      return { ok: true };
    }

    console.error("admin-notify auth error:", "Missing Authorization header.");
    return {
      ok: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <ADMIN_NOTIFY_SECRET>.",
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.error(
      "admin-notify auth error:",
      "Invalid Authorization scheme; expected 'Bearer <token>'.",
    );
    return {
      ok: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <ADMIN_NOTIFY_SECRET>.",
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    console.error("admin-notify auth error:", "Bearer token is empty.");
    return {
      ok: false,
      error: "Missing admin notify secret in Authorization header.",
    };
  }

  if (token !== notifySecret) {
    console.error(
      `Auth mismatch! Expected: ${maskSecret(notifySecret)}, Got: ${maskSecret(token)}`,
    );
    return {
      ok: false,
      error: "Invalid admin notify secret.",
    };
  }

  return { ok: true };
}

function normalizePayload(body: unknown): { type: NotifyType; details: unknown } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const direct = body as NotifyPayload;
  if (direct.type) {
    return {
      type: direct.type,
      details: direct.details ?? {},
    };
  }

  const webhook = body as SupabaseWebhookPayload;
  if (webhook.type === "INSERT" && webhook.table === "listings" && webhook.record) {
    const record = webhook.record;
    return {
      type: "new_listing",
      details: {
        listing_id: record.id,
        title: record.title,
        seller_id: record.seller_id,
        category: record.category,
        price: record.price,
        city: record.city,
        area: record.area,
        status: record.status,
        created_at: record.created_at,
      },
    };
  }

  return null;
}

function formatDetails(details: unknown): string {
  if (details == null) {
    return "No additional details provided.";
  }

  if (typeof details === "string") {
    return details.trim() || "No additional details provided.";
  }

  if (typeof details === "object") {
    const entries = Object.entries(details as Record<string, unknown>).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    );

    if (entries.length === 0) {
      return "No additional details provided.";
    }

    return entries
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
      .join("\n");
  }

  return String(details);
}

function getTypeLabel(type: NotifyType): string {
  switch (type) {
    case "new_user":
      return "New user signup";
    case "new_listing":
      return "New listing submitted";
    default:
      return type.replaceAll("_", " ");
  }
}

function buildEmailHtml(typeLabel: string, detailsText: string) {
  const escapedType = escapeHtml(typeLabel);
  const escapedDetails = escapeHtml(detailsText).replaceAll("\n", "<br />");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4f1;font-family:Inter,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f1;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e4de;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#181614;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;">${APP_NAME} Admin</p>
                <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;">${escapedType}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:13px;color:#666;">A new marketplace event needs your attention.</p>
                <div style="border:1px solid #ece8e2;border-radius:12px;padding:16px;background:#faf9f7;">
                  <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;color:#222;">${escapedDetails}</pre>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 20px;border-top:1px solid #ece8e2;font-size:11px;color:#888;">
                Sent automatically by ${APP_NAME} admin notifications.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const authHeaderRedacted =
    authHeader?.startsWith("Bearer ")
      ? `Bearer ${maskSecret(authHeader.slice("Bearer ".length))}`
      : authHeader ?? null;
  console.log("Incoming Authorization Header:", authHeaderRedacted);

  // Log request headers early to debug auth failures (do not print full bearer token).
  console.log("admin-notify incoming headers:", {
    method: req.method,
    contentType: req.headers.get("content-type"),
    authorizationPresent: Boolean(authHeader),
    authorizationStartsWithBearer: authHeader?.startsWith("Bearer ") ?? false,
    "x-client-info": req.headers.get("x-client-info"),
    "user-agent": req.headers.get("user-agent"),
  });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const auth = isAuthorized(req);
  if (!auth.ok) {
    const status = auth.error.includes("not configured") ? 500 : 401;
    return jsonResponse({ error: auth.error }, status);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY is not configured." }, 500);
  }

  let body: unknown = null;
  let rawBody = "";
  try {
    rawBody = await req.text();
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = { _raw: rawBody };
    }
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  console.log(
    "Function invoked with payload:",
    JSON.stringify(body),
  );

  const payload = normalizePayload(body);
  if (!payload) {
    return jsonResponse({ error: "Expected { type, details } or a listings INSERT webhook payload." }, 400);
  }

  const typeLabel = getTypeLabel(payload.type);
  const detailsText = formatDetails(payload.details);
  const subject = `[${APP_NAME}] ${typeLabel}`;

  const resend = new Resend(resendApiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject,
      text: `${typeLabel}\n\n${detailsText}`,
      html: buildEmailHtml(typeLabel, detailsText),
    });

    if (error) {
      // Resend sometimes returns a structured error alongside `data`.
      throw error;
    }

    return jsonResponse({
      ok: true,
      id: data?.id ?? null,
      type: payload.type,
    });
  } catch (error) {
    console.error("Resend API error:", error);

    // Always return HTTP 200 so the database trigger sees a "successful" HTTP response.
    return jsonResponse(
      {
        ok: false,
        error: "Failed to send email.",
        type: payload.type,
      },
      200,
    );
  }
});
