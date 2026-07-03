/**
 * OTP delivery audit helper — diagnosis only.
 *
 * Usage:
 *   node scripts/audit-otp.mjs settings
 *   node scripts/audit-otp.mjs classify '{"status":422,"error_code":"otp_disabled","msg":"..."}'
 *   node scripts/audit-otp.mjs probe +2348012345678 login
 *   node scripts/audit-otp.mjs probe +2348012345678 signup
 *
 * probe sends ONE OTP request. Do not run repeatedly on the same number.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }

    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return env;
}

function classifyOtpFailure(payload, mode) {
  const status = payload.status ?? payload.code ?? null;
  const errorCode = (
    payload.error_code ??
    payload.code ??
    payload.error ??
    ""
  )
    .toString()
    .toLowerCase();
  const message = (
    payload.msg ??
    payload.message ??
    payload.error_description ??
    ""
  )
    .toString()
    .toLowerCase();

  const result = {
    phone: payload.phone ?? null,
    mode: mode ?? null,
    httpStatus: status,
    error_code: errorCode || null,
    message: payload.msg ?? payload.message ?? null,
    requestReceived: status !== null && status !== 0,
    smsAttempted: false,
    category: "unknown",
    rejectionReason: "Unknown rejection. Check Supabase Auth logs.",
    uiMessage: null,
    dashboardChecks: [],
  };

  if (status === 200 || status === "200") {
    result.category = "success";
    result.smsAttempted = true;
    result.rejectionReason = "Supabase accepted OTP request. SMS handoff to Twilio Verify expected.";
    return result;
  }

  if (
    errorCode === "otp_disabled" ||
    (message.includes("signups not allowed") && message.includes("otp"))
  ) {
    result.category = "supabase_auth_blocked";
    result.smsAttempted = false;
    result.rejectionReason =
      mode === "login" || mode === "recover"
        ? "Supabase rejected before SMS: Login/Recover uses shouldCreateUser=false and this phone has no existing Auth user (or OTP signup path blocked)."
        : "Supabase rejected before SMS: OTP signup disabled or blocked for this instance.";
    result.uiMessage = "Unable to send verification code right now.";
    result.dashboardChecks = [
      "Supabase → Authentication → Users: does this phone exist?",
      "If new user: retry on Sign up tab (shouldCreateUser=true), not Login.",
      "Supabase → Authentication → Providers → Phone: confirm phone sign-ups enabled.",
    ];
    return result;
  }

  if (
    errorCode === "user_not_found" ||
    message.includes("user not found") ||
    (mode === "login" && message.includes("signups not allowed"))
  ) {
    result.category = "supabase_auth_blocked";
    result.smsAttempted = false;
    result.rejectionReason =
      "No Auth user for this phone on login/recover path.";
    result.uiMessage =
      mode === "login"
        ? "Would map to 'No account found' if checked before otp_disabled."
        : "Unable to send verification code right now.";
    result.dashboardChecks = [
      "Use Sign up for new numbers first.",
      "Supabase → Authentication → Users",
    ];
    return result;
  }

  if (
    errorCode === "sms_send_failed" ||
    message.includes("failed to send sms") ||
    message.includes("error sending sms")
  ) {
    result.category = "twilio_blocked";
    result.smsAttempted = true;
    result.rejectionReason =
      "Supabase accepted auth request but Twilio Verify rejected or failed delivery.";
    result.uiMessage = "Unable to send verification code right now.";
    result.dashboardChecks = [
      "Twilio Console → Verify → Logs: lookup this E.164 number",
      "Twilio billing / account status",
      "Verify Service SID matches Supabase Phone provider config",
      "Geo permissions for Nigeria (+234)",
      "Trial account verified-caller restrictions",
    ];
    return result;
  }

  if (
    errorCode === "over_sms_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    result.category = "rate_limit";
    result.smsAttempted = false;
    result.rejectionReason = "Supabase auth rate limit hit for this phone/IP.";
    result.uiMessage = "Too many attempts. Wait a moment and try again.";
    result.dashboardChecks = [
      "Supabase → Authentication → Rate limits",
      "Wait 60s+ before retrying same number",
    ];
    return result;
  }

  if (
    errorCode === "validation_failed" ||
    message.includes("invalid phone") ||
    message.includes("unable to parse phone")
  ) {
    result.category = "invalid_number";
    result.smsAttempted = false;
    result.rejectionReason = "Phone failed Supabase validation before SMS.";
    result.uiMessage = "Enter a valid Nigerian phone number...";
    result.dashboardChecks = [
      "Confirm E.164 output e.g. +2348101234567",
      "Reject malformed prefixes/length",
    ];
    return result;
  }

  if (
    errorCode === "phone_exists" ||
    errorCode === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    result.category = "supabase_auth_blocked";
    result.smsAttempted = false;
    result.rejectionReason = "Signup attempted for phone that already has an account.";
    result.uiMessage = "This phone already has an account. Login instead.";
    result.dashboardChecks = ["Use Login tab instead of Sign up"];
    return result;
  }

  if (
    errorCode === "phone_provider_disabled" ||
    errorCode === "provider_disabled" ||
    message.includes("phone provider")
  ) {
    result.category = "supabase_auth_blocked";
    result.smsAttempted = false;
    result.rejectionReason = "Phone provider disabled in Supabase project.";
    result.uiMessage = "Unable to send verification code right now.";
    result.dashboardChecks = [
      "Supabase → Authentication → Providers → Phone → Enable",
    ];
    return result;
  }

  if (
    message.includes("blocked") ||
    message.includes("fraud") ||
    message.includes("risk") ||
    message.includes("suspicious")
  ) {
    result.category = "fraud_protection";
    result.smsAttempted = true;
    result.rejectionReason =
      "Carrier, Twilio, or Supabase fraud/risk controls may have blocked delivery.";
    result.uiMessage = "Unable to send verification code right now.";
    result.dashboardChecks = [
      "Twilio Verify logs for fraud/risk status",
      "Supabase Auth logs for anomaly flags",
    ];
    return result;
  }

  result.uiMessage = "Unable to send verification code right now. or raw message";
  return result;
}

async function fetchSettings(url, key) {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  return {
    status: response.status,
    body: await response.json().catch(async () => response.text()),
  };
}

async function probeOtp(url, key, phone, mode) {
  const createUser = mode === "signup";

  const response = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      create_user: createUser,
    }),
  });

  const raw = await response.text();
  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    body = { message: raw };
  }

  const payload = {
    phone,
    status: response.status,
    error_code: body.error_code ?? body.code,
    msg: body.msg ?? body.message ?? body.error_description,
    message: body.msg ?? body.message,
    headers: {
      "x-sb-error-code": response.headers.get("x-sb-error-code"),
    },
    raw: body,
  };

  const diagnosis = classifyOtpFailure(payload, mode);
  console.log(JSON.stringify({ probe: payload, diagnosis }, null, 2));
}

const command = process.argv[2];

if (command === "classify") {
  const raw = process.argv[3] ?? "{}";
  const mode = process.argv[4] ?? "login";
  const payload = JSON.parse(raw);
  console.log(JSON.stringify(classifyOtpFailure(payload, mode), null, 2));
  process.exit(0);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (command === "settings") {
  const settings = await fetchSettings(url, key);
  console.log(JSON.stringify(settings, null, 2));
  process.exit(0);
}

if (command === "probe") {
  const phone = process.argv[3];
  const mode = process.argv[4] ?? "login";

  if (!phone) {
    console.error("Usage: node scripts/audit-otp.mjs probe +234XXXXXXXXXX login|signup");
    process.exit(1);
  }

  await probeOtp(url, key, phone, mode);
  process.exit(0);
}

console.log(`OTP audit helper

Commands:
  settings                         Read Supabase auth settings (no OTP sent)
  probe <e164> login|signup          Send ONE OTP probe and classify result
  classify '<json>' login|signup     Classify a captured network response

Browser diagnosis (no extra OTP):
  1. Open DevTools → Console
  2. Attempt OTP once for the failing number
  3. Copy logs: sending otp, otp error code/message/status
  4. Network → POST .../auth/v1/otp → Response + x-sb-error-code header
  5. Run: node scripts/audit-otp.mjs classify '<paste json>' login
`);
