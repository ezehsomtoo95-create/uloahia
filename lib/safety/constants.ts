/** Shared report reasons — must stay in sync with the CHECK constraint in
 * supabase/migrations/0054_unify_report_systems.sql (`content_reports.reason`).
 *
 * Merged vocabulary: the safety set plus the legacy listing-report set, so
 * listing reports and community/comment/chat reports share one list. */
export const REPORT_REASONS = [
  "Scam / fraud",
  "Spam",
  "Duplicate listing",
  "Wrong category",
  "Prohibited item",
  "Harassment",
  "Misleading information",
  "Illegal or unsafe activity",
  "Hate or abusive content",
  "Inappropriate content",
  "Contact info posted publicly",
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
  "listing_report",
] as const;

export type ContentReportType = (typeof CONTENT_REPORT_TYPES)[number];

export function isContentReportType(value: unknown): value is ContentReportType {
  return (
    typeof value === "string" &&
    (CONTENT_REPORT_TYPES as readonly string[]).includes(value)
  );
}

/** Human labels for the unified admin reports view. */
export const CONTENT_REPORT_TYPE_LABELS: Record<ContentReportType, string> = {
  community_post: "Community post",
  community_reply: "Community reply",
  listing_comment: "Listing comment",
  chat_conversation: "Chat",
  listing_report: "Listing",
};

export function contentReportTypeLabel(value: string): string {
  return isContentReportType(value)
    ? CONTENT_REPORT_TYPE_LABELS[value]
    : "Other";
}

/** Only listings support the "delete listing" / "suspend seller" admin actions. */
export function isListingReportType(value: unknown): boolean {
  return value === "listing_report";
}