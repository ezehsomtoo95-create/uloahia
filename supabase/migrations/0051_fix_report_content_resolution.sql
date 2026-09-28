-- =============================================================================
-- 0051: Fix report_content existence check (false "no longer available" error)
--
-- Renumbered from 0050 during Phase 1 so the numbering no longer collides with
-- the report_content psql spec, which was moved out of supabase/migrations/
-- into supabase/spec/ (it is a scratch harness, not a migration).
--
-- Note: migration 0052 re-CREATEs this same function to repoint the admin
-- notification link, and carries the full corrected body, so it converges
-- correctly regardless of whether this migration has been applied yet.
-- =============================================================================
-- Bug: 0049 computed the offender/existence step as
--
--   SELECT author_id <> v_reporter, author_id INTO v_exists, v_offender
--   FROM public.community_posts WHERE id = p_content_id;
--
-- and then gated on `NOT v_exists` -> RAISE content_not_found.
-- Because `v_exists` was really "reporter != author", reporting YOUR OWN
-- existing post / reply / listing comment produced `v_exists = false`
-- and surfaced the misleading "This content is no longer available to
-- report." even though the content exists and is reportable.
--
-- Fix: separate the two concerns. Existence is now a genuine row check;
-- ownership (author vs reporter) no longer drives the existence gate.
--
-- Behaviour preserved:
--   * Only genuinely-missing / removed content raises content_not_found
--     (the ONLY case that should show "no longer available to report").
--   * Auth + content-type validation + rate-limiting unchanged.
--   * Per-user duplicate open-report prevention (unique index) unchanged.
--   * Admin notification via the EXISTING notifications table unchanged.
--   * chat_conversation branch behaviour unchanged (reports the other
--     participant as before).
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
  END;

  -- Notify admins through the EXISTING notification system (no new infra).
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT u.id, 'content_report',
         'New report: ' || p_content_type,
         p_reason || CASE WHEN length(btrim(coalesce(p_details,''))) > 0
                          THEN ' - ' || left(btrim(p_details), 120) ELSE '' END,
         '/admin/moderation'
  FROM auth.users u
  WHERE lower(u.email) = ANY (
    regexp_split_to_array(lower(trim(public.get_admin_email_setting())), '\s*,\s*')
  )
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_content(text, uuid, text, text) TO authenticated, service_role;
