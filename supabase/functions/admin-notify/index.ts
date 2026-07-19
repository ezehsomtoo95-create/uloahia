import { Resend } from "npm:resend@4.0.0";

const ADMIN_EMAIL = "ezehsomtoo95@gmail.com";
const FROM_EMAIL = "info@ahiaulo.ng";
const APP_NAME = "AhiaUlo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-notify-secret",
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

  const headerSecret = req.headers.get("x-admin-notify-secret")?.trim() ?? "";
  if (!headerSecret) {
    console.error("admin-notify auth error:", "Missing x-admin-notify-secret header.");
    return {
      ok: false,
      error: "Unauthorized. Missing x-admin-notify-secret header.",
    };
  }

  if (headerSecret !== notifySecret) {
    console.error(
      `Auth mismatch! Expected: ${maskSecret(notifySecret)}, Got: ${maskSecret(headerSecret)}`,
    );
    return {
      ok: false,
      error: "Unauthorized. Invalid x-admin-notify-secret.",
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
  const secretHeader = req.headers.get("x-admin-notify-secret");
  const authHeaderRedacted =
    authHeader?.startsWith("Bearer ")
      ? `Bearer ${maskSecret(authHeader.slice("Bearer ".length))}`
      : authHeader ?? null;
  console.log("Incoming Authorization Header:", authHeaderRedacted);
  console.log(
    "Incoming x-admin-notify-secret:",
    secretHeader ? maskSecret(secretHeader) : null,
  );

  // Log request headers early to debug auth failures (do not print full secrets).
  console.log("admin-notify incoming headers:", {
    method: req.method,
    contentType: req.headers.get("content-type"),
    authorizationPresent: Boolean(authHeader),
    adminNotifySecretPresent: Boolean(secretHeader),
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

  const resend = new Resend(resendApiKey);

  if (payload.type === "chat_message_email" || payload.type === "listing_comment_email") {
    const details =
      payload.details && typeof payload.details === "object"
        ? (payload.details as Record<string, unknown>)
        : {};
    const toEmail = typeof details.to_email === "string" ? details.to_email.trim() : "";
    if (!toEmail) {
      return jsonResponse({ ok: false, error: `Missing to_email for ${payload.type}.` }, 200);
    }

    const isComment = payload.type === "listing_comment_email";
    const subject = isComment
      ? `[${APP_NAME}] New comment on your listing`
      : `[${APP_NAME}] New message on your listing`;
    const text = isComment
      ? "Someone left a comment on your listing on AhiaUlo. Log in to view and reply."
      : "You have received a new message regarding a listing on AhiaUlo. Log in to your dashboard to view and reply.";
    const heading = isComment ? "New listing comment" : "New marketplace message";
    const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#faf7f0;font-family:Inter,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e0d4;border-radius:14px;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:#0f6b4c;font-weight:600;">${APP_NAME}</p>
                <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;">${heading}</h1>
                <p style="margin:0;font-size:14px;line-height:1.55;color:#444;">${text}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: [toEmail],
        subject,
        text,
        html,
      });
      if (error) throw error;
      return jsonResponse({ ok: true, id: data?.id ?? null, type: payload.type });
    } catch (error) {
      console.error("Resend engagement email error:", error);
      return jsonResponse({ ok: false, error: "Failed to send engagement email.", type: payload.type }, 200);
    }
  }

  if (payload.type === "phone_change_security") {
    const details =
      payload.details && typeof payload.details === "object"
        ? (payload.details as Record<string, unknown>)
        : {};
    const toEmail = typeof details.to_email === "string" ? details.to_email.trim() : "";
    const newPhone =
      typeof details.new_phone === "string" && details.new_phone.trim()
        ? details.new_phone.trim()
        : "";

    if (!toEmail) {
      return jsonResponse({ ok: false, error: "Missing to_email for phone_change_security." }, 200);
    }

    const text = "Your phone number has been updated.";
    const detail =
      newPhone
        ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#444;">New number: <strong>${escapeHtml(newPhone)}</strong></p>`
        : "";
    const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#faf7f0;font-family:Inter,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e0d4;border-radius:14px;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:#0f6b4c;font-weight:600;">${APP_NAME}</p>
                <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;">Phone updated</h1>
                <p style="margin:0;font-size:14px;line-height:1.55;color:#444;">${escapeHtml(text)}</p>
                ${detail}
                <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#666;">If this wasn't you, please contact support immediately.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: [toEmail],
        subject: `[${APP_NAME}] Your phone number has been updated`,
        text: newPhone ? `${text}\n\nNew number: ${newPhone}` : text,
        html,
      });
      if (error) throw error;
      return jsonResponse({ ok: true, id: data?.id ?? null, type: payload.type });
    } catch (error) {
      console.error("Resend phone-change security email error:", error);
      return jsonResponse(
        { ok: false, error: "Failed to send phone-change security email.", type: payload.type },
        200,
      );
    }
  }

  const typeLabel = getTypeLabel(payload.type);
  const detailsText = formatDetails(payload.details);
  const subject = `[${APP_NAME}] ${typeLabel}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject,
      text: `${typeLabel}\n\n${detailsText}`,
      html: buildEmailHtml(typeLabel, detailsText),
    });

    if (error) {
      throw error;
    }

    return jsonResponse({
      ok: true,
      id: data?.id ?? null,
      type: payload.type,
    });
  } catch (error) {
    console.error("Resend API error:", error);

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
