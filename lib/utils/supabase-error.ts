"use client";

export function formatSupabaseError(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}
