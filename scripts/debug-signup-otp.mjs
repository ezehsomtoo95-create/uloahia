/**
 * Signup OTP probe — one request, diagnosis only.
 * Usage: node scripts/debug-signup-otp.mjs +2348100000000
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return env;
}

const phone = process.argv[2] ?? "+2348100000000";
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const payload = {
  phone,
  create_user: true,
  data: { full_name: "Signup Probe" },
};

console.log("request", {
  endpoint: `${url}/auth/v1/otp`,
  payload,
});

const response = await fetch(`${url}/auth/v1/otp`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const bodyText = await response.text();
console.log("response status", response.status);
console.log("response headers", {
  "x-sb-error-code": response.headers.get("x-sb-error-code"),
});
console.log("response body", bodyText);
