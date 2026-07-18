/**
 * Human-friendly profile/shop name validation.
 * Allows spaces and common punctuation; preserves the user's casing.
 */

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 40;

export function normalizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function validateUsername(input: string):
  | { ok: true; username: string }
  | { ok: false; error: string } {
  const username = normalizeUsername(input);

  if (!username) {
    return { ok: false, error: "Enter a name." };
  }

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters.`,
    };
  }

  // Letters (any language), numbers, spaces, and light punctuation — no path/URL breakers.
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,38}$/u.test(username)) {
    return {
      ok: false,
      error: "Use letters, numbers, spaces, and basic punctuation ( . ' - _ ).",
    };
  }

  return { ok: true, username };
}

export function shopPathForUsername(username: string): string {
  return `/shop/${encodeURIComponent(username)}`;
}
