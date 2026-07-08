const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;

/**
 * Normalizes user-provided plain text before validation/persistence.
 * This strips control chars and HTML tags to reduce XSS risk from rich payloads.
 */
export function sanitizePlainText(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAGS, " ")
    .replace(/\s+/g, " ")
    .trim();
}
