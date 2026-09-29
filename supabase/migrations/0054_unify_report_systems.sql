-- =============================================================================
-- 0054: Unify listing + content reports into one content_reports queue
-- =============================================================================
-- Today two independent report systems write to two tables, and only one of
-- them is ever displayed:
--
--   legacy  ReportListingButton -> reportListing() -> `reports`
--           (listing only; shown in the admin dashboard)
--   new     ReportSheet         -> submitContentReport() -> `content_reports`
--           (all other content; shown NOWHERE - no application code read it)
--
-- This migration makes `content_reports` the single system so admins get one
-- queue instead of two disconnected ones.
--
-- Changes:
--   1. content_type gains `listing_report`
--   2. reason is widened from the 8 safety reasons to a merged 12 that also
--      covers the legacy listing vocabulary
--   3. report_content() accepts listing_report and resolves the offender from
--      listings.seller_id
--   4. the 2 legacy `reports` rows are backfilled, left OPEN so they surface
--      in the unified queue
--
-- The `reports` table is deliberately NOT dropped. It stays as an audit trail;
-- the app stops reading it.
--
-- MUST be applied AFTER 0053: it re-CREATEs report_content and carries the
-- corrected /admin#admin-reports notification link, so applying it before
-- 0053 would reintroduce the dead /admin/moderation link.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) content_type: add listing_report
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_content_type_check;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_content_type_check
  CHECK (content_type IN (
    'community_post',
    'community_reply',
    'listing_comment',
    'chat_conversation',
    'listing_report'
  ));


-- -----------------------------------------------------------------------------
-- 2) reason: merged vocabulary (12)
-- -----------------------------------------------------------------------------
-- Kept from the legacy listing set: Duplicate, Wrong category, Prohibited item.
-- Kept from the safety set: Scam / fraud, Spam, Harassment,
-- Misleading information, Illegal or unsafe activity, Hate or abusive content,
-- Inappropriate content, Other.
-- Added: Contact info posted publicly (phone numbers / addresses published in
-- open posts instead of using in-app chat).
ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_reason_check;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_reason_check
  CHECK (reason IN (
    'Scam / fraud',
    'Spam',
    'Duplicate listing',
    'Wrong category',
    'Prohibited item',
    'Harassment',
    'Misleading information',
    'Illegal or unsafe activity',
    'Hate or abusive content',
    'Inappropriate content',
    'Contact info posted publicly',
    'Other'
  ));

-- -----------------------------------------------------------------------------
-- 3) report_content(): accept listing_report
-- -----------------------------------------------------------------------------
-- Full body re-declared so this converges regardless of which version of the
-- function is currently live. The four existing branches are unchanged.
CREATE OR REPLACE FUNCTION public.report_content(
  p_content_type text,
  p_content_id   uuid,
  p_reason       text,
  p_details      text DEFAULT NULL
)
RETURNS TABLE (ok boolean, already_reported boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter   uuid := auth.uid();
  v_offender   uuid;
  v_exists     boolean;
  v_count      bigint;
  v_listing_status text;
BEGIN
  IF v_reporter IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_content_type NOT IN
       ('community_post','community_reply','listing_comment',
        'chat_conversation','listing_report') THEN
    RAISE EXCEPTION 'invalid_content_type';
  END IF;

  -- Resolve the offender AND whether the content actually exists, as two
  -- independent facts. Reporting your own existing content is permitted; the
  -- unique open-report index and the per-user rate limit prevent abuse.
  IF p_content_type = 'community_post' THEN
    SELECT author_id INTO v_offender
    FROM public.community_posts
    WHERE id = p_content_id;
  ELSIF p_content_type = 'community_reply' THEN
    SELECT author_id INTO v_offender
    FROM public.community_replies
    WHERE id = p_content_id;
  ELSIF p_content_type = 'listing_comment' THEN
    SELECT author_id INTO v_offender
    FROM public.listing_comments
    WHERE id = p_content_id;
  ELSIF p_content_type = 'listing_report' THEN
    -- Listings are the one type that can be hidden, so the offender only
    -- counts while the listing is still publicly visible.
    SELECT seller_id, status INTO v_offender, v_listing_status
    FROM public.listings
    WHERE id = p_content_id;
    IF v_listing_status IS DISTINCT FROM 'approved' THEN
      v_offender := NULL;
    END IF;
  ELSE -- chat_conversation: either participant may report the OTHER one
    SELECT CASE WHEN seller_id <> v_reporter THEN buyer_id ELSE seller_id END
      INTO v_offender
    FROM public.conversations
    WHERE id = p_content_id;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_exists := v_count > 0 AND v_offender IS NOT NULL;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'content_not_found';
  END IF;

  BEGIN
    INSERT INTO public.content_reports
      (content_type, content_id, reporter_id, reported_user_id, reason, details)
    VALUES
      (p_content_type, p_content_id, v_reporter, v_offender, p_reason,
       left(btrim(coalesce(p_details, '')), 1000));
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT true, true;
    RETURN;
  END;

  -- Notify admins through the EXISTING notification system (no new infra).
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT u.id, 'content_report',
         'New report: ' || p_content_type,
         p_reason || CASE WHEN length(btrim(coalesce(p_details,''))) > 0
                          THEN ' - ' || left(btrim(p_details), 120) ELSE '' END,
         '/admin#admin-reports'
  FROM auth.users u
  WHERE lower(u.email) = ANY (
    regexp_split_to_array(lower(trim(public.get_admin_email_setting())), '\s*,\s*')
  )
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_content(text, uuid, text, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4) Backfill the legacy `reports` rows
-- -----------------------------------------------------------------------------
-- Reason map (legacy -> merged):
--   "Scam"            -> "Scam / fraud"
--   "Fake item"       -> "Scam / fraud"
--   "Spam"            -> "Spam"
--   "Duplicate"       -> "Duplicate listing"
--   "Wrong category"  -> "Wrong category"
--   "Prohibited item" -> "Prohibited item"
--   anything else     -> "Other"
--
-- Only rows whose target listing still exists AND is approved are migrated:
-- reported_user_id is NOT NULL REFERENCES auth.users, and a hidden listing has
-- no meaningful offender.
--
-- Status is copied through, so OPEN legacy reports land in the unified queue
-- rather than silently disappearing. `reports` is left untouched as the audit
-- trail; ON CONFLICT makes a re-run a no-op.
INSERT INTO public.content_reports (
  content_type, content_id, reporter_id, reported_user_id,
  reason, details, status, created_at
)
SELECT
  'listing_report',
  r.listing_id,
  r.reporter_id,
  l.seller_id,
  CASE r.reason
    WHEN 'Scam'            THEN 'Scam / fraud'
    WHEN 'Fake item'       THEN 'Scam / fraud'
    WHEN 'Spam'            THEN 'Spam'
    WHEN 'Duplicate'       THEN 'Duplicate listing'
    WHEN 'Wrong category'  THEN 'Wrong category'
    WHEN 'Prohibited item' THEN 'Prohibited item'
    ELSE 'Other'
  END,
  'Migrated from the legacy reports table on 2026-09-29.',
  CASE WHEN r.status = 'open' THEN 'open' ELSE 'resolved' END,
  r.created_at
FROM public.reports r
JOIN public.listings l ON l.id = r.listing_id
WHERE l.status = 'approved'
  AND r.reporter_id IS NOT NULL
ON CONFLICT (reporter_id, content_type, content_id) WHERE status = 'open'
DO NOTHING;


-- -----------------------------------------------------------------------------
-- 5) Verification (read-only; safe to leave in the migration)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_total   bigint;
  v_listing bigint;
  v_open    bigint;
BEGIN
  SELECT count(*) INTO v_total FROM public.content_reports;
  SELECT count(*) INTO v_listing
    FROM public.content_reports WHERE content_type = 'listing_report';
  SELECT count(*) INTO v_open
    FROM public.content_reports WHERE status = 'open';
  RAISE NOTICE 'content_reports: % row(s) total, % listing_report, % open',
    v_total, v_listing, v_open;
END;
$$;
