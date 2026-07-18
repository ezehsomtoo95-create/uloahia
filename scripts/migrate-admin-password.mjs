#!/usr/bin/env node
/**
 * One-time admin password migration.
 *
 * Finds the account whose profile phone matches ADMIN_PHONE, sets a bcrypt-hashed
 * password via Supabase Auth Admin API (never stored in plain text in the DB),
 * and marks password_set_at on the profile.
 *
 * Does NOT create a new user or change user id — existing data and sessions stay intact.
 *
 * Usage:
 *   MIGRATION_TEMP_PASSWORD='your-temp-password' node scripts/migrate-admin-password.mjs
 *
 * Requires in .env.local (or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_PHONE
 *   MIGRATION_TEMP_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length >= 13) {
    digits = `0${digits.slice(3, 13)}`;
  } else if (digits.startsWith("234")) {
    digits = `0${digits.slice(3)}`;
  }

  if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = `0${digits}`;
  }

  return digits;
}

function phonesMatch(left, right) {
  if (!left || !right) {
    return false;
  }

  return normalizePhone(left) === normalizePhone(right);
}

function normalizeNigerianPhone(input) {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  if (digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
    return `+234${digits}`;
  }

  return null;
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPhone = (process.env.ADMIN_PHONE ?? "").trim();
const password = process.env.MIGRATION_TEMP_PASSWORD;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!adminPhone) {
  console.error("Missing ADMIN_PHONE.");
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error("Set MIGRATION_TEMP_PASSWORD (min 8 characters) in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, phone, full_name");

if (profilesError) {
  console.error("Failed to load profiles:", profilesError.message);
  process.exit(1);
}

const adminProfile = (profiles ?? []).find((profile) =>
  phonesMatch(profile.phone, adminPhone),
);

if (!adminProfile) {
  console.error(
    "No profile found matching ADMIN_PHONE. Sign in once via OTP so a profile exists, then rerun.",
  );
  process.exit(1);
}

const e164Phone = normalizeNigerianPhone(adminProfile.phone) ?? adminProfile.phone;

console.log("Migrating admin account:", {
  userId: adminProfile.id,
  phoneMasked: `${e164Phone.slice(0, 4)}•••${e164Phone.slice(-3)}`,
});

const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
  adminProfile.id,
  {
    password,
    phone_confirm: true,
  },
);

if (updateError) {
  console.error("Failed to set admin password:", updateError.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({
    phone: e164Phone,
    password_set_at: new Date().toISOString(),
  })
  .eq("id", adminProfile.id);

if (profileError) {
  if (profileError.message.includes("password_set_at")) {
    console.warn(
      "Password set on auth user, but profiles.password_set_at is missing.",
    );
    console.warn("Apply supabase/migrations/0024_password_auth.sql, then rerun to mark profile.");
  } else {
    console.error("Password set but profile update failed:", profileError.message);
    process.exit(1);
  }
}

console.log("Admin password migration complete.");
console.log("- User id unchanged:", updatedUser.user.id);
console.log("- Login with phone + MIGRATION_TEMP_PASSWORD");
console.log("- Change your password after first login via Forgot password flow.");
console.log("- Existing browser sessions remain valid until they expire.");
