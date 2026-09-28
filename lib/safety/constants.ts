/** Shared report reasons — must stay in sync with the CHECK constraint in
 * supabase/migrations/0049_safety_moderation.sql (`content_reports.reason`). */
export const REPORT_REASONS = [
  "Scam / fraud",
  "Spam",
  "Harassment",
  "Misleading information",
  "Illegal or unsafe activity",
  "Hate or abusive content",
  "Inappropriate content",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    (REPORT_REASONS as readonly string[]).includes(value)
  );
}

export const CONTENT_REPORT_TYPES = [
  "community_post",
  "community_reply",
  "listing_comment",
  "chat_conversation",
] as const;

export type ContentReportType = (typeof CONTENT_REPORT_TYPES)[number];

export function isContentReportType(value: unknown): value is ContentReportType {
  return (
    typeof value === "string" &&
    (CONTENT_REPORT_TYPES as readonly string[]).includes(value)
  );
}