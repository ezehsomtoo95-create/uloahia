import { Resend } from "npm:resend@4.0.0";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")?.trim() || "ezehsomtoo95@gmail.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")?.trim() || "info@ahiaulo.ng";
const APP_NAME = "AhiaUlo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-notify-secret",
};

type NotifyType = string;

type NotifyPayload = {
  type?: NotifyType;
  /** Alias for type */
  event?: NotifyType;
  /** Recipient email (user emails). Admin types ignore this and use ADMIN_EMAIL. */
  to?: string;
  email?: string;
  recipient?: string;
  subject?: string;
  message?: string;
  content?: string;
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

function canonicalizeType(raw: string): NotifyType {
  switch (raw) {
    case "new_signup":
    case "signup":
      return "new_user";
    case "new_message":
    case "message":
      return "chat_message_email";
    default:
      return raw;
  }
}

function pickRecipient(payload: NotifyPayload, details: Record<string, unknown>): string {
  const candidates = [
    payload.to,
    payload.email,
    payload.recipient,
    typeof details.to_email === "string" ? details.to_email : "",
    typeof details.email === "string" ? details.email : "",
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickMessage(payload: NotifyPayload, details: Record<string, unknown>): string {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof payload.content === "string" && payload.content.trim()) {
    return payload.content.trim();
  }
  if (typeof details.message === "string" && details.message.trim()) {
    return details.message.trim();
  }
  if (typeof details.content === "string" && details.content.trim()) {
    return details.content.trim();
  }
  if (typeof details.message_preview === "string" && details.message_preview.trim()) {
    return details.message_preview.trim();
  }
  return "";
}

function normalizePayload(body: unknown): {
  type: NotifyType;
  details: Record<string, unknown>;
  to: string;
  subject: string;
  message: string;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const direct = body as NotifyPayload;
  const rawType = (direct.type || direct.event || "").trim();

  if (rawType) {
    const details =
      direct.details && typeof direct.details === "object"
        ? { ...(direct.details as Record<string, unknown>) }
        : {};
    const type = canonicalizeType(rawType);
    const to = pickRecipient(direct, details);
    const message = pickMessage(direct, details);
    const subject =
      typeof direct.subject === "string" && direct.subject.trim()
        ? direct.subject.trim()
        : "";

    return { type, details, to, subject, message };
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
      to: "",
      subject: "",
      message: "",
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
    case "chat_message_email":
      return "New marketplace message";
    case "listing_comment_email":
      return "New listing comment";
    default:
      return type.replaceAll("_", " ");
  }
}

function buildEmailHtml(heading: string, bodyText: string, eyebrow = `${APP_NAME} Admin`) {
  const escapedHeading = escapeHtml(heading);
  const escapedBody = escapeHtml(bodyText).replaceAll("\n", "<br />");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4f1;font-family:Inter,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f1;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e4de;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#064E3B;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;">${escapedHeading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="border:1px solid #ece8e2;border-radius:12px;padding:16px;background:#faf9f7;">
                  <p style="margin:0;font-size:14px;line-height:1.55;color:#333;">${escapedBody}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 20px;border-top:1px solid #ece8e2;font-size:11px;color:#888;">
                Sent automatically by ${APP_NAME}.
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

async function sendResendEmail(args: {
  resend: Resend;
  to: string;
  subject: string;
  text: string;
  html: string;
  type: string;
}) {
  try {
    const { data, error } = await args.resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    if (error) {
      throw error;
    }
    return jsonResponse({ ok: true, id: data?.id ?? null, type: args.type });
  } catch (error) {
    console.error("Resend API error:", error);
    return jsonResponse(
      { ok: false, error: "Failed to send email.", type: args.type },
      200,
    );
  }
}

Deno.serve(async (req) => {
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
  try {
    const rawBody = await req.text();
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = { _raw: rawBody };
    }
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  console.log("Function invoked with payload:", JSON.stringify(body));

  const payload = normalizePayload(body);
  if (!payload) {
    return jsonResponse(
      {
        error:
          "Expected { type, to?, message?, details? } — e.g. type: new_signup | new_message | new_listing.",
      },
      400,
    );
  }

  const resend = new Resend(resendApiKey);

  // User-facing engagement emails
  if (payload.type === "chat_message_email" || payload.type === "listing_comment_email") {
    const details = payload.details;
    const toEmail =
      payload.to ||
      (typeof details.to_email === "string" ? details.to_email.trim() : "") ||
      (typeof details.email === "string" ? details.email.trim() : "");

    if (!toEmail) {
      console.error(`Missing recipient email for ${payload.type}`, details);
      return jsonResponse({ ok: false, error: `Missing recipient email for ${payload.type}.` }, 200);
    }

    const isComment = payload.type === "listing_comment_email";
    const heading = isComment ? "New listing comment" : "New message";
    const fallbackText = isComment
      ? "Someone left a comment on your listing on AhiaUlo. Log in to view and reply."
      : "You have a new message on AhiaUlo. Log in to Chat to view and reply.";
    const text = payload.message || fallbackText;
    const subject =
      payload.subject ||
      (isComment
        ? `[${APP_NAME}] New comment on your listing`
        : `[${APP_NAME}] New message`);

    console.log("Sending engagement email:", { type: payload.type, to: toEmail });

    return await sendResendEmail({
      resend,
      to: toEmail,
      subject,
      text,
      html: buildEmailHtml(heading, text, APP_NAME),
      type: payload.type,
    });
  }

  if (payload.type === "phone_change_security") {
    const toEmail = payload.to;
    const newPhone =
      typeof payload.details.new_phone === "string" && payload.details.new_phone.trim()
        ? payload.details.new_phone.trim()
        : "";

    if (!toEmail) {
      return jsonResponse({ ok: false, error: "Missing to_email for phone_change_security." }, 200);
    }

    const text = payload.message || "Your phone number has been updated.";
    const detail = newPhone ? `\n\nNew number: ${newPhone}` : "";

    return await sendResendEmail({
      resend,
      to: toEmail,
      subject: payload.subject || `[${APP_NAME}] Your phone number has been updated`,
      text: `${text}${detail}`,
      html: buildEmailHtml(
        "Phone updated",
        `${text}${newPhone ? `\n\nNew number: ${newPhone}` : ""}\n\nIf this wasn't you, please contact support immediately.`,
        APP_NAME,
      ),
      type: payload.type,
    });
  }

  // Admin emails (signup, listing, custom)
  const typeLabel = getTypeLabel(payload.type);
  const detailsText = payload.message || formatDetails(payload.details);
  const subject = payload.subject || `[${APP_NAME}] ${typeLabel}`;
  const toAdmin = payload.to || ADMIN_EMAIL;

  return await sendResendEmail({
    resend,
    to: toAdmin,
    subject,
    text: `${typeLabel}\n\n${detailsText}`,
    html: buildEmailHtml(typeLabel, detailsText),
    type: payload.type,
  });
});
