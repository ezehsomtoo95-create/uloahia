-- =============================================================================
-- 0053: Repoint report_content admin notification link to /admin#admin-reports
-- =============================================================================
-- Phase 1 landmine. The report_content RPC (0049) notified admins with
--
--   '/admin/moderation'
--
-- but no such route exists. app/admin/reports/page.tsx only redirects to the
-- /admin#admin-reports anchor on the single-page admin dashboard, so every
-- "New report" notification linked to a 404.
--
-- The full corrected function body is reproduced here (not just the link
-- change) so this migration converges to the same state regardless of which
-- version of report_content is currently live - i.e. whether 0051's
-- existence-check fix has been applied yet or not. CREATE OR REPLACE is
-- idempotent.
--
-- The real moderation queue UI is deferred to Phase 2. Until then, reports
-- are collected and admins are pointed at the existing reports section.
--
-- Everything else is unchanged from 0051:
--   * auth + content-type validation
--   * real existence check (only genuinely-missing content raises
--     content_not_found; reporting your own content is allowed)
--   * per-user duplicate open-report prevention via the unique index
--   * rate limiting is applied by the caller (submitContentReport)
--   * chat_conversation reports the other participant
-- =============================================================================
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
BEGIN
  IF v_reporter IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_content_type NOT IN ('community_post','community_reply','listing_comment','chat_conversation') THEN
    RAISE EXCEPTION 'invalid_content_type';
  END IF;

  -- Resolve the offender (author / other participant) AND whether the content
  -- actually exists, as two independent facts. Reporting your own existing
  -- content is permitted: the unique open-report index (reporter, type, id)
  -- and the per-user rate limit still prevent abuse; admins still review.
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
  ELSE -- chat_conversation: either participant may report the OTHER one
    SELECT CASE WHEN seller_id <> v_reporter THEN buyer_id ELSE seller_id END
      INTO v_offender
    FROM public.conversations
    WHERE id = p_content_id;
  END IF;

  -- Real existence check: a row was found for this content id.
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_exists := v_count > 0 AND v_offender IS NOT NULL;

  -- Only genuinely-missing / removed content reaches here.
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
  END IF;

  -- Notify admins through the EXISTING notification system (no new infra).
  -- Link points at the reports section of the existing single-page admin
  -- dashboard; the dedicated /admin/moderation route is deferred to Phase 2.
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
