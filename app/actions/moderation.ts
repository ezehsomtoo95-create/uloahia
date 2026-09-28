"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isContentReportType,
  isReportReason,
} from "@/lib/safety/constants";
import { consumeRateLimit } from "@/lib/safety/guard";

type ActionResult =
  | { ok: true; alreadyReported?: boolean }
  | { ok: false; error: string };

export async function submitContentReport(input: {
  contentType: string;
  contentId: string;
  reason: string;
  details?: string | null;
}): Promise<ActionResult> {
  if (!isContentReportType(input.contentType)) {
    return { ok: false, error: "Unsupported content type." };
  }
  if (!isReportReason(input.reason)) {
    return { ok: false, error: "Choose a reason for the report." };
  }
  const contentId = input.contentId?.trim();
  if (!contentId) {
    return { ok: false, error: "Missing content reference." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to report content." };
  }

  // Light flood control for reports themselves.
  const allowed = await consumeRateLimit(
    supabase,
    user.id,
    "content_report",
    12,
    60 * 60,
  );
  if (!allowed) {
    return {
      ok: false,
      error: "You have reported several items recently. Try again later.",
    };
  }

  const details = input.details?.trim();
  const { data, error } = await supabase.rpc("report_content", {
    p_content_type: input.contentType,
    p_content_id: contentId,
    p_reason: input.reason,
    p_details: details && details.length > 0 ? details : null,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("not_authenticated")) {
      return { ok: false, error: "Sign in to report content." };
    }
    if (message.includes("invalid_content_type")) {
      return { ok: false, error: "Unsupported content type." };
    }
    if (message.includes("content_not_found")) {
      return { ok: false, error: "This content is no longer available to report." };
    }
    return { ok: false, error: "Could not send your report. Try again." };
  }

  const row = Array.isArray(data) ? data[0] : null;
  return { ok: true, alreadyReported: row?.already_reported === true };
}