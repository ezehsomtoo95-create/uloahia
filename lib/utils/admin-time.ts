/**
 * Admin date formatting.
 *
 * Deliberately NOT in lib/data/admin-reports.ts: that module imports
 * "server-only", and the verification queue table is a client component that
 * needs the same formatting. Putting it here keeps one implementation that
 * both server and client can import.
 */
export function formatAdminTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
