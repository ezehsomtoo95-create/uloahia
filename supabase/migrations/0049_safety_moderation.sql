-- =============================================================================
-- 0049: Safety & moderation system ("moderation by exception")
-- =============================================================================
-- Philosophy:
--   * Normal content publishes immediately (no manual approval queue).
--   * Suspicious content publishes BUT is flagged for admin review.
--   * High-confidence harmful content is blocked automatically and logged.
--   * User reports route content into an admin moderation queue.
--   * Repeat offenders accumulate progressive restrictions.
--
-- Layers:
--   1) content_reports        - user-submitted reports (all content types)
--   2) moderation_events      - audit trail of every automated/manual action
--   3) user_moderation_state  - per-user strike count + progressive restrictions
--   4) action_rate_limits     - rolling-window anti-spam counters
--   5) moderate_content_text  - lightweight heuristic scorer (NOT a giant
--      banned-word list; Nigerian slang/business language stays untouched)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Notifications: extend type constraint ADDITIVELY (preserves existing data)
--    'content_report' alerts admins about new reports in their notifications.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'chat_message',
    'listing_comment',
    'listing_comment_reply',
    'security',
    'listing_approved',
    'listing_rejected',
    'listing_reported',
    'listing_expires_soon',
    'community_reply',
    'community_like',
    'content_report'
  )
);

-- -----------------------------------------------------------------------------
-- 2) Hide support for replies/comments (posts already carry `status`)
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_replies
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.listing_comments
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_community_replies_hidden
  ON public.community_replies (post_id, created_at)
  WHERE hidden = false;

CREATE INDEX IF NOT EXISTS idx_listing_comments_hidden
  ON public.listing_comments (listing_id, created_at)
  WHERE hidden = false;

COMMENT ON COLUMN public.community_replies.hidden IS
  'Set by moderators/auto-mod; hidden replies are excluded from public listings.';
COMMENT ON COLUMN public.listing_comments.hidden IS
  'Set by moderators/auto-mod; hidden comments are excluded from public threads.';

-- -----------------------------------------------------------------------------
-- 3) Community post status gains a moderator-controlled 'hidden' state
--    (data layers filter status = 'published', so hidden posts simply vanish
--    from public surfaces while remaining auditable by admins)
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_status_check;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_status_check
  CHECK (status IN ('published', 'hidden', 'removed'));

-- -----------------------------------------------------------------------------
-- 4) Core moderation tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    text NOT NULL CHECK (content_type IN
                    ('community_post', 'community_reply', 'listing_comment', 'chat_conversation')),
  content_id      uuid NOT NULL,
  reporter_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  reason          text NOT NULL CHECK (reason IN (
                    'Scam / fraud',
                    'Spam',
                    'Harassment',
                    'Misleading information',
                    'Illegal or unsafe activity',
                    'Hate or abusive content',
                    'Inappropriate content',
                    'Other')),
  details         text CHECK (char_length(coalesce(details, '')) <= 1000),

  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'resolved')),
  resolution      text CHECK (resolution IN (
                    'dismissed',
                    'content_hidden',
                    'content_removed',
                    'user_restricted',
                    'user_suspended',
                    'user_banned',
                    null)),

  admin_note      text CHECK (char_length(coalesce(admin_note, '')) <= 2000),
  resolved_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

-- One open report per (reporter, content) prevents report spam duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_open
  ON public.content_reports (reporter_id, content_type, content_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_content_reports_queue
  ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user
  ON public.content_reports (reported_user_id)
  WHERE status = 'open';

-- Automated + manual audit trail (the backbone of the future dashboard).
CREATE TABLE IF NOT EXISTS public.moderation_events (
  id            bigserial PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- author/offender
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- admin (null = system)
  source        text NOT NULL DEFAULT 'auto'
                  CHECK (source IN ('auto', 'report', 'admin')),
  content_type  text CHECK (content_type IN
                  ('community_post', 'community_reply', 'listing_comment', 'chat_message')),
  content_id    uuid,
  action        text NOT NULL CHECK (action IN (
                  'flagged_review',
                  'blocked',
                  'hidden',
                  'removed',
                  'warning',
                  'restricted',
                  'suspended',
                  'banned',
                  'cleared')),
  risk_level    text CHECK (risk_level IN ('low', 'review', 'high')),
  reason_code   text,
  detail        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_events_user
  ON public.moderation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_content
  ON public.moderation_events (content_type, content_id);

-- Per-user progressive enforcement state.
CREATE TABLE IF NOT EXISTS public.user_moderation_state (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  strikes           integer NOT NULL DEFAULT 0 CHECK (strikes >= 0),
  restricted_until  timestamptz,
  suspended         boolean NOT NULL DEFAULT false,
  banned            boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.ensure_user_moderation_state(p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.user_moderation_state (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

-- Rolling-window anti-spam counters.
CREATE TABLE IF NOT EXISTS public.action_rate_limits (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key   text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  used         integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (user_id, action_key)
);

REVOKE ALL ON public.content_reports FROM anon;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
REVOKE ALL ON public.moderation_events FROM anon, authenticated;
REVOKE ALL ON public.user_moderation_state FROM anon, authenticated;
GRANT USAGE ON SEQUENCE public.moderation_events_id_seq TO service_role;

-- -----------------------------------------------------------------------------
-- 5) Row level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_rate_limits ENABLE ROW LEVEL SECURITY;

-- Reports: users see their own submissions; admins see everything.
DROP POLICY IF EXISTS "content_reports_select_own_or_admin" ON public.content_reports;
CREATE POLICY "content_reports_select_own_or_admin" ON public.content_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR coalesce(public.is_email_admin(), false)
    OR coalesce(public.is_admin(), false)
  );

DROP POLICY IF EXISTS "content_reports_insert_authenticated" ON public.content_reports;
CREATE POLICY "content_reports_insert_authenticated" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Events/state/rate-limits are system tables; only admins can read them.
DROP POLICY IF EXISTS "moderation_events_select_admin" ON public.moderation_events;
CREATE POLICY "moderation_events_select_admin" ON public.moderation_events
  FOR SELECT TO authenticated
  USING (coalesce(public.is_email_admin(), false) OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "user_moderation_state_select_admin" ON public.user_moderation_state;
CREATE POLICY "user_moderation_state_select_admin" ON public.user_moderation_state
  FOR SELECT TO authenticated
  USING (coalesce(public.is_email_admin(), false) OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "action_rate_limits_none" ON public.action_rate_limits;
CREATE POLICY "action_rate_limits_none" ON public.action_rate_limits
  FOR SELECT TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 6) Rate limiting (rolling window)
--    Stricter budgets are applied automatically when the account is new or
--    already has moderation strikes; normal active users never feel this.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_user_id    uuid,
  p_action_key text,
  p_max        integer,
  p_window     interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factor numeric := 1;
  v_max    integer;
  v_rows   record;
BEGIN
  IF p_user_id IS NULL OR p_action_key IS NULL OR p_max IS NULL OR p_max < 1 THEN
    RETURN false;
  END IF;

  -- New accounts (joined < 24h ago) get the stricter budget.
  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.created_at > now() - interval '24 hours'
  ) THEN
    v_factor := 0.4;
  END IF;

  -- Users already carrying moderation strikes get a further reduction.
  v_factor := v_factor * COALESCE((
      SELECT CASE WHEN ms.strikes >= 2 THEN 0.5 ELSE 1.0 END
      FROM public.user_moderation_state ms
      WHERE ms.user_id = p_user_id
    ), 1.0);

  v_max := GREATEST(1, floor(p_max * v_factor)::int);

  INSERT INTO public.action_rate_limits AS r (user_id, action_key, window_start, used)
  VALUES (p_user_id, p_action_key, now(), 1)
  ON CONFLICT (user_id, action_key) DO UPDATE
    SET window_start = CASE
          WHEN r.window_start + p_window <= now() THEN now()
          ELSE r.window_start
        END,
        used = CASE
          WHEN r.window_start + p_window <= now() THEN 1
          ELSE r.used + 1
        END
  RETURNING used, window_start INTO v_rows;

  RETURN v_rows.used <= v_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text, integer, interval) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7) Lightweight automated content checks (NOT a giant banned-word list)
--    A few layered heuristics score obvious scams / spam / abuse. Ordinary
--    Nigerian business language, names and slang must pass through untouched.
--    Outcomes:  low    -> publish normally
--               review -> publish BUT flag for admin review
--               high   -> block automatically and log the event
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_content_text(p_text text)
RETURNS TABLE (risk_level text, reason_code text, detail jsonb)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  norm      text;
  words     int;
  hits_scam int := 0;
  hits_link int := 0;
  hits_abus int := 0;
  threats   int := 0;
  caps_add  int := 0;
  total     int := 0;
  reasons   text[] := ARRAY[]::text[];
BEGIN
  IF p_text IS NULL OR length(btrim(p_text)) < 10 THEN
    RETURN QUERY SELECT 'low'::text, 'ok'::text,
      jsonb_build_object('score', 0);
    RETURN;
  END IF;

  norm := lower(regexp_replace(p_text, '\s+', ' ', 'g'));
  words := array_length(string_to_array(norm, ' '), 1);

  -- A. Threats of violence -> always high risk regardless of context
  SELECT count(*) INTO threats
  FROM unnest(ARRAY[
    'i will kill you',
    'we will kill you',
    'i will harm you',
    'watch your back i am coming for you'
  ]) AS t(pattern)
  WHERE norm LIKE '%' || pattern || '%';

  -- B. Advance-fee / investment-scam language (weighted; a single hit
  --    flags for review but never blocks ordinary trade talk)
  WITH patterns AS (
    SELECT * FROM unnest(ARRAY[
      '(send|pay)\s+(money|the\s+money)?\s*(first|before|upfront|in advance)',
      'advance\s+fee',
      'guaranteed\s+(profit|profits|return|returns|income|earnings)',
      '(double|triple|multiply)\s+your\s+(money|investment|bitcoin|btc|usdt|eth)',
      '(investment|forex|crypto)\s+(plan|package|opportunity)[^.]{0,80}(roi|%|percent|interest|return)',
      '(roi|apy)\s*[:=]?\s*[0-9]{2,}\s*%?',
      '\d+\s*%\s*(daily|weekly|monthly)\s*(profit|return|roi)',
      'activation\s+fee.{0,30}(withdraw|release|unlock)',
      '(clearing|custom)\s+fee.{0,30}(before|prior).{0,20}(delivery|shipping)'
    ]) AS pattern
  ), scam_matches AS (
    SELECT regexp_count(norm, pattern) AS c FROM patterns
  )
  SELECT coalesce(sum(c), 0) INTO hits_scam FROM scam_matches WHERE c > 0;

  -- Suspicious pairing: off-platform payment talk + contact dumping
  IF norm ~ 'whats?app' AND norm ~ '(pay\s*(me|now)|send\s*money|deposit|make\s*payment)' THEN
    hits_scam := hits_scam + 1;
  END IF;

  -- C. Suspicious external links (shorteners & unrecognised hosts).
  --    Well-known public platforms stay allowed.
  WITH links AS (
    SELECT (regexp_matches(
              norm,
              '(?:https?://|www\.)[a-z0-9.-]+\.[a-z]{2,}[^\s]*',
              'g'))::text AS url
  ),
  hosts AS (
    SELECT split_part(split_part(url, '//', 2), '/', 1) AS host FROM links
  ),
  counted AS (
    SELECT h.host,
           CASE
             WHEN h.host ~ '(^|\.)?(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|goo\.gl|rb\.gy|shorturl\.at|ow\.ly|rebrand\.ly|tiny\.cc)$'
               THEN 2
             WHEN h.host ~ '([a-z0-9-]+\.)*(youtube\.com|youtu\.be|google\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|wa\.me|whatsapp\.com|jumia\.com|konga\.com|linkedin\.com)$'
               THEN 0
             ELSE 1
           END AS w
    FROM hosts h
  )
  SELECT coalesce(sum(w), 0) INTO hits_link FROM counted;

  -- D. Obvious abusive / inappropriate language (small layer only)
  WITH patterns AS (
    SELECT * FROM unnest(ARRAY[
      '\bidiot\b', '\bbastard\b', '\bmoron\b', '\bimbecile\b',
      '\bstupid\s+(person|people|boy|girl)\b',
      '\bnudes\b', '\bsexting\b',
      'fuck\s+you', 'fuck(ed|ing)\s+(you|your)'
    ]) AS pattern
  ), abus_matches AS (
    SELECT regexp_count(norm, pattern) AS c FROM patterns
  )
  SELECT least(coalesce(sum(c), 0), 3) INTO hits_abus FROM abus_matches WHERE c > 0;

  -- E. Caps-shouting amplifier (never enough on its own)
  IF words > 8 AND length(p_text) > 60 THEN
    DECLARE
      letters text;
    BEGIN
      letters := regexp_replace(p_text, '[^A-Za-z]', '', 'g');
      IF length(letters) > 30
         AND length(regexp_replace(letters, '[^A-Z]', '', 'g'))::numeric
             / length(letters) > 0.85 THEN
        caps_add := 1;
      END IF;
    END;
  END IF;

  -- Aggregate into one of three outcomes:
  --   low    -> publish normally (most content, incl. ordinary trade talk)
  --   review -> publish BUT flag for admin review
  --   high   -> block automatically and log
  total := hits_scam + hits_link + hits_abus + caps_add;

  IF threats > 0 THEN
    reason_code := 'threat';
    risk_level := 'high';
    detail := jsonb_build_object('score', total, 'threats', threats);
  ELSIF hits_abus >= 3 THEN
    reason_code := 'abusive_language';
    risk_level := 'high';
    detail := jsonb_build_object('score', total, 'abuse', hits_abus);
  ELSIF hits_scam >= 3 THEN
    reason_code := 'advance_fee_or_investment_scam';
    risk_level := 'high';
    detail := jsonb_build_object('score', total, 'scam', hits_scam, 'links', hits_link);
  ELSIF (hits_scam + caps_add) >= 2 OR (hits_link >= 2 AND hits_scam >= 1)
        OR (hits_abus + caps_add) >= 2 THEN
    reason_code := CASE WHEN hits_scam + caps_add >= 2 THEN 'suspicious_payment_language'
                        ELSE 'suspicious_content' END;
    risk_level := 'review';
    detail := jsonb_build_object(
      'score', total, 'scam', hits_scam, 'links', hits_link,
      'abuse', hits_abus, 'caps_shout', caps_add
    );
  ELSE
    reason_code := 'ok';
    risk_level := 'low';
    detail := jsonb_build_object('score', total);
  END IF;

  RETURN QUERY SELECT risk_level, reason_code, detail;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8) Enforcement entry point — server actions call this BEFORE publishing.
--    Returns decision: 'allow' | 'review' | 'block'
--      allow  -> publish immediately
--      review -> publish AND content is flagged for admin attention
--      block  -> do NOT publish; event recorded for admin review
--    Also enforces progressive restrictions (restricted/suspended/banned).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_content_safety(
  p_user    uuid,
  p_text    text,
  p_surface text
)
RETURNS TABLE (decision text, risk_level text, reason_code text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk   text;
  v_reason text;
  v_detail jsonb;
  v_state  public.user_moderation_state;
BEGIN
  IF p_user IS NULL THEN
    RETURN QUERY SELECT 'block'::text, 'high'::text, 'not_authenticated'::text,
      'Sign in to continue.'::text;
    RETURN;
  END IF;

  -- Progressive enforcement gates.
  SELECT * INTO v_state FROM public.user_moderation_state WHERE user_id = p_user;
  IF v_state.banned IS NOT DISTINCT FROM true THEN
    RETURN QUERY SELECT 'block'::text, 'high'::text, 'account_banned'::text,
      'Your account has been banned. Contact support if you think this is a mistake.'::text;
    RETURN;
  END IF;
  IF v_state.suspended IS NOT DISTINCT FROM true THEN
    RETURN QUERY SELECT 'block'::text, 'high'::text, 'account_suspended'::text,
      'Your account is suspended and cannot post right now.'::text;
    RETURN;
  END IF;
  IF v_state.restricted_until IS NOT NULL AND v_state.restricted_until > now() THEN
    RETURN QUERY SELECT 'block'::text, 'high'::text, 'posting_restricted'::text,
      'Posting is temporarily restricted on your account. Try again later.'::text;
    RETURN;
  END IF;

  PERFORM public.ensure_user_moderation_state(p_user);
  SELECT risk_level, reason_code, detail
    INTO v_risk, v_reason, v_detail
  FROM public.moderate_content_text(p_text);

  IF v_risk = 'high' THEN
    INSERT INTO public.moderation_events
      (user_id, actor_id, source, action, risk_level, reason_code, detail)
    VALUES
      (p_user, NULL, 'auto', 'blocked', 'high', v_reason,
       jsonb_build_object('surface', p_surface, 'check', coalesce(v_detail, '{}'::jsonb)));
    RETURN QUERY SELECT 'block'::text, v_risk, v_reason,
      'This was not sent because it looks unsafe or abusive. Edit it and try again.'::text;
    RETURN;
  END IF;

  IF v_risk = 'review' THEN
    INSERT INTO public.moderation_events
      (user_id, actor_id, source, action, risk_level, reason_code, detail)
    VALUES
      (p_user, NULL, 'auto', 'flagged_review', 'review', v_reason,
       jsonb_build_object('surface', p_surface, 'check', coalesce(v_detail, '{}'::jsonb)));
    RETURN QUERY SELECT 'review'::text, v_risk, v_reason, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'allow'::text, v_risk, v_reason, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_content_safety(uuid, text, text) TO authenticated, service_role;





-- -----------------------------------------------------------------------------
-- 9) Report submission - one RPC for every content type. Validates the target
--    exists, prevents duplicate open reports, and alerts admins through the
--    EXISTING notification system (no new notification infrastructure).
-- -----------------------------------------------------------------------------
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
  v_reporter uuid := auth.uid();
  v_offender uuid;
  v_exists   boolean;
BEGIN
  IF v_reporter IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_content_type NOT IN ('community_post','community_reply','listing_comment','chat_conversation') THEN
    RAISE EXCEPTION 'invalid_content_type';
  END IF;

  IF p_content_type = 'community_post' THEN
    SELECT author_id <> v_reporter, author_id INTO v_exists, v_offender
    FROM public.community_posts WHERE id = p_content_id;
  ELSIF p_content_type = 'community_reply' THEN
    SELECT author_id <> v_reporter, author_id INTO v_exists, v_offender
    FROM public.community_replies WHERE id = p_content_id;
  ELSIF p_content_type = 'listing_comment' THEN
    SELECT author_id <> v_reporter, author_id INTO v_exists, v_offender
    FROM public.listing_comments WHERE id = p_content_id;
  ELSE -- chat_conversation: either participant may report the OTHER one
    SELECT CASE WHEN seller_id <> v_reporter THEN buyer_id ELSE seller_id END
      INTO v_offender
    FROM public.conversations WHERE id = p_content_id;
    v_exists := v_offender IS NOT NULL;
  END IF;

  IF v_exists IS NULL OR NOT v_exists OR v_offender IS NULL THEN
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
