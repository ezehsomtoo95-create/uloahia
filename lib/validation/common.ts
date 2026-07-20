import { z } from "zod";

export const listingIdSchema = z.string().uuid("Invalid listing id.");
export const userIdSchema = z.string().uuid("Invalid user id.");
export const reportIdSchema = z.string().uuid("Invalid report id.");
export const visitorIdSchema = z.string().trim().min(1, "Visitor id is required.").max(128);

export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  return schema.parse(input);
}

/** Plain text for auth banners — never pass through objects (avoids literal `{}` in JSX). */
export function coerceAuthBannerText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "[object Object]") {
      return fallback;
    }

    return trimmed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Error) {
    return coerceAuthBannerText(value.message, fallback);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("message" in record) {
      return coerceAuthBannerText(record.message, fallback);
    }

    if ("error" in record) {
      return coerceAuthBannerText(record.error, fallback);
    }
  }

  return fallback;
}

export function formatZodError(error: unknown, fallback = "Invalid input."): string {
  if (error instanceof z.ZodError) {
    return coerceAuthBannerText(error.issues[0]?.message, fallback);
  }

  if (error instanceof Error) {
    return coerceAuthBannerText(error.message, fallback);
  }

  return fallback;
}
