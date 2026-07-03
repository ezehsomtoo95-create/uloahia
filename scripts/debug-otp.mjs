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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const phone = process.argv[2] ?? "+2348100000000";

console.log("env check", {
  hasUrl: Boolean(url),
  hasAnonKey: Boolean(key),
  anonKeyPrefix: key ? key.slice(0, 14) : null,
  urlHost: url ? new URL(url).host : null,
});

const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

console.log("auth settings status", settingsResponse.status);
console.log(
  "auth settings body",
  await settingsResponse.text(),
);

const otpLoginResponse = await fetch(`${url}/auth/v1/otp`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    phone,
    create_user: false,
  }),
});

console.log("otp login (create_user:false) phone", phone);
console.log("otp login status", otpLoginResponse.status);
console.log("otp login body", await otpLoginResponse.text());

const otpSignupResponse = await fetch(`${url}/auth/v1/otp`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    phone,
    create_user: true,
  }),
});

console.log("otp signup (create_user:true) phone", phone);
console.log("otp signup status", otpSignupResponse.status);
console.log("otp signup body", await otpSignupResponse.text());
