/**
 * "Report listing" trigger for the listing detail page.
 *
 * Replaces the old ReportListingButton, which wrote to the legacy `reports`
 * table. Listing reports now go through the same ReportSheet as community
 * posts, replies, comments and chats, so there is a single write path into
 * `content_reports`.
 *
 * Client-side because the sheet's open state lives here; the listing page
 * itself is a server component.
 */
"use client";

import { useState } from "react";
import { ReportButton, ReportSheet } from "@/components/safety/report-sheet";

export function ListingReportButton({
  listingId,
  isAuthenticated,
}: {
  listingId: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ReportButton onClick={() => setOpen(true)} label="Report listing" />
      <ReportSheet
        contentType="listing_report"
        contentId={listingId}
        open={open}
        onClose={() => setOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
