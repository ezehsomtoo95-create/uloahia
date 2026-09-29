-- =============================================================================
-- 0055: Seller verification tiers, ID document review, seller profile fields
-- =============================================================================
-- Phase 2. Replaces the blanket "Verified" badge, which only ever meant "a
-- phone number is on file" and was therefore true of almost every seller.
--
-- The tiering code already ships in the app (commit before this one) and is
-- defensive: it renders no badge until these objects exist. So this migration
-- can be applied at any point after that deploy without breaking a page.
--
-- The public-seller RPCs are ADDED, not replaced. CREATE OR REPLACE cannot
-- widen a RETURNS TABLE, and dropping the originals would risk a store page
-- 500ing between this migration and the deploy. Instead:
--   OLD (untouched)              NEW (added here)
--   get_public_seller_by_id      get_public_seller_profile_by_id
--   get_public_seller_by_username get_public_seller_profile_by_username
--   get_public_sellers_by_ids    get_public_seller_cards
-- The app now calls the new names. The old functions stay in place as dead
-- code and can be dropped later once you are satisfied.
--
-- Depends on nothing from 0054. Order: any time after the Phase 2 tier commit.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) The tier enum
-- -----------------------------------------------------------------------------
-- shop_verified / business_verified are reserved for the paid badges in
-- Phase 5. They exist now so that adding them later is not an enum migration,
-- but nothing in this migration or the app can set them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_tier') THEN
    CREATE TYPE public.verification_tier AS ENUM (
      'none',
      'phone_verified',
      'id_verified',
      'shop_verified',
      'business_verified'
    );
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_tier public.verification_tier
    NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.profiles.verification_tier IS
  'Strongest verification check this seller has passed. none = no badge shown.';

-- -----------------------------------------------------------------------------
-- 2) Backfill from the existing phone check
-- -----------------------------------------------------------------------------
-- Mirrors EXACTLY the predicate the live RPCs use today:
--   (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone))
--
-- Deliberately does NOT re-apply 0036's `NOT is_pending_phone(phone)` guard.
-- The badge previously reflected the RPC predicate, so re-applying the guard
-- here would silently downgrade some existing sellers the moment this ran -
-- a trust signal disappearing with no explanation. The predicate is the
-- contract; this backfill keeps it identical.
UPDATE public.profiles
SET verification_tier = 'phone_verified'
WHERE verification_tier = 'none'
  AND (phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(phone));

-- -----------------------------------------------------------------------------
-- 3) ID document review queue
-- -----------------------------------------------------------------------------
-- A table rather than columns on profiles, so a rejected upload can be
-- replaced and the full history of submissions is auditable.
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_path text NOT NULL,
  doc_type text NOT NULL DEFAULT 'government_id'
            CHECK (doc_type IN ('government_id', 'passport', 'drivers_licence', 'national_id')),
  status text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text CHECK (char_length(coalesce(rejection_reason, '')) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_requests_pending_idx
  ON public.verification_requests (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS verification_requests_user_idx
  ON public.verification_requests (user_id, created_at DESC);

-- One in-flight request per seller: stops someone uploading ten copies while
-- waiting for a decision, and guarantees the queue has one row per person.
CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_one_pending_per_user
  ON public.verification_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- A seller may see their OWN submissions (to know it is being reviewed) but
-- never anyone else's, and never the document itself - that is storage-only.
DROP POLICY IF EXISTS "verification_requests_own_select" ON public.verification_requests;
CREATE POLICY "verification_requests_own_select"
  ON public.verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_email_admin() OR public.is_admin());

DROP POLICY IF EXISTS "verification_requests_own_insert" ON public.verification_requests;
CREATE POLICY "verification_requests_own_insert"
  ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Approving/rejecting is an admin action and is expected to run through the
-- service role from a server action, not from a client RLS path. Still granted
-- explicitly so admin sessions work if that changes.
DROP POLICY IF EXISTS "verification_requests_admin_update" ON public.verification_requests;
CREATE POLICY "verification_requests_admin_update"
  ON public.verification_requests
  FOR UPDATE TO authenticated
  USING (public.is_email_admin() OR public.is_admin())
  WITH CHECK (public.is_email_admin() OR public.is_admin());

GRANT SELECT, INSERT ON public.verification_requests TO authenticated;
GRANT UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON TABLE public.verification_requests TO service_role;

-- -----------------------------------------------------------------------------
-- 4) Private bucket for identity documents
-- -----------------------------------------------------------------------------
-- SECURITY: public = false. Government IDs must never be reachable by URL.
-- The app NEVER builds an image URL for these; an admin preview is minted as a
-- short-lived signed URL from a server action, per request.
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Path convention: <user_id>/<uuid>.<ext>
-- Sellers can upload ONLY into their own folder. The `(storage.foldername(name))[1]`
-- check is the entire authorisation boundary for writes.
DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sellers may DELETE their own uploads (to replace a rejected document) but
-- there is deliberately NO select policy for non-admins: a seller cannot
-- re-read their own ID through the API. Staff read via signed URLs minted with
-- the service role, which bypasses RLS by design.
DROP POLICY IF EXISTS "verification_docs_delete_own" ON storage.objects;
CREATE POLICY "verification_docs_delete_own"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "verification_docs_admin_select" ON storage.objects;
CREATE POLICY "verification_docs_admin_select"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (public.is_email_admin() OR public.is_admin())
  );

-- -----------------------------------------------------------------------------
-- 5) Public seller profile RPCs (ADDITIVE - originals are left in place)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_seller_profile_by_id(seller_uuid uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  state text,
  city text,
  created_at timestamptz,
  phone_verified boolean,
  verification_tier public.verification_tier,
  active_listing_count integer,
  total_views bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.state,
    p.city,
    p.created_at,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS
    phone_verified,
    p.verification_tier,
    (
      SELECT count(*)::integer
      FROM public.listings l
      WHERE l.seller_id = p.id AND l.status = 'approved'
    ) AS active_listing_count,
    (
      SELECT coalesce(sum(l.views), 0)::bigint
      FROM public.listings l
      WHERE l.seller_id = p.id
    ) AS total_views
  FROM public.profiles p
  WHERE p.id = seller_uuid
    AND coalesce(p.account_status, 'active') = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller_profile_by_id(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_seller_profile_by_username(shop_username text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  state text,
  city text,
  created_at timestamptz,
  phone_verified boolean,
  verification_tier public.verification_tier,
  active_listing_count integer,
  total_views bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.state,
    p.city,
    p.created_at,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS
    phone_verified,
    p.verification_tier,
    (
      SELECT count(*)::integer
      FROM public.listings l
      WHERE l.seller_id = p.id AND l.status = 'approved'
    ) AS active_listing_count,
    (
      SELECT coalesce(sum(l.views), 0)::bigint
      FROM public.listings l
      WHERE l.seller_id = p.id
    ) AS total_views
  FROM public.profiles p
  WHERE p.username = shop_username
    AND coalesce(p.account_status, 'active') = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller_profile_by_username(text) TO anon, authenticated;

-- Card variant: the compact shape listing cards need, tier included.
CREATE OR REPLACE FUNCTION public.get_public_seller_cards(seller_uuids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  phone_verified boolean,
  verification_tier public.verification_tier
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS
    phone_verified,
    p.verification_tier
  FROM public.profiles p
  WHERE p.id = ANY (seller_uuids)
    AND coalesce(p.account_status, 'active') = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller_cards(uuid[]) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6) Contact taps (buyer-side engagement signal for seller stats)
-- -----------------------------------------------------------------------------
-- A NEW table rather than widening analytics_events: that table is
-- FORCE ROW LEVEL SECURITY, admin-readable only, and populated by triggers on
-- INSERT. Buyer-side tap events have a different write path and a different
-- audience, and mixing them would muddy both.
--
-- visitor_id is a rotating anon identifier, never an auth user id. It exists
-- only to de-duplicate repeat taps within a window and is never exposed to
-- the seller's own dashboard (the aggregate RPC strips it).
CREATE TABLE IF NOT EXISTS public.contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'whatsapp'
            CHECK (kind IN ('whatsapp', 'chat', 'call')),
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_events_seller_created_idx
  ON public.contact_events (seller_id, created_at DESC);

ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;

-- Sellers read their own aggregate; nobody writes through RLS. The insert
-- happens in a server action using the service role.
DROP POLICY IF EXISTS "contact_events_own_select" ON public.contact_events;
CREATE POLICY "contact_events_own_select"
  ON public.contact_events
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_email_admin() OR public.is_admin());

GRANT SELECT ON public.contact_events TO authenticated;
GRANT ALL ON TABLE public.contact_events TO service_role;

-- -----------------------------------------------------------------------------
-- 7) Seller weekly stats
-- -----------------------------------------------------------------------------
-- Aggregates listing_views (which already logs one row per unique view per
-- 24h with a timestamp) and contact_events by day.
--
-- PRIVACY: returns aggregate day buckets only. visitor_id is never selected,
-- so no buyer-level identifier can reach the seller's own dashboard.
CREATE OR REPLACE FUNCTION public.seller_weekly_stats(
  seller_uuid uuid,
  days integer DEFAULT 28
)
RETURNS TABLE (
  day date,
  views bigint,
  contacts bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH bounds AS (
    SELECT
      (current_date - (least(greatest(days, 1), 90) - 1))::date AS start_day,
      current_date::date AS end_day
  ),
  view_days AS (
    SELECT
      (lv.created_at AT TIME ZONE 'UTC')::date AS day,
      count(*)::bigint AS views
    FROM public.listing_views lv
    JOIN public.listings l ON l.id = lv.listing_id
    CROSS JOIN bounds b
    WHERE l.seller_id = seller_uuid
      AND (lv.created_at AT TIME ZONE 'UTC')::date BETWEEN b.start_day AND b.end_day
    GROUP BY 1
  ),
  contact_days AS (
    SELECT
      (ce.created_at AT TIME ZONE 'UTC')::date AS day,
      count(*)::bigint AS contacts
    FROM public.contact_events ce
    CROSS JOIN bounds b
    WHERE ce.seller_id = seller_uuid
      AND (ce.created_at AT TIME ZONE 'UTC')::date BETWEEN b.start_day AND b.end_day
    GROUP BY 1
  ),
  spine AS (
    SELECT generate_series(b.start_day, b.end_day, interval '1 day')::date AS day
    FROM bounds b
  )
  SELECT
    s.day,
    coalesce(v.views, 0) AS views,
    coalesce(c.contacts, 0) AS contacts
  FROM spine s
  LEFT JOIN view_days v ON v.day = s.day
  LEFT JOIN contact_days c ON c.day = s.day
  ORDER BY s.day;
$$;

GRANT EXECUTE ON FUNCTION public.seller_weekly_stats(uuid, integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8) Median first-response time
-- -----------------------------------------------------------------------------
-- Only counts a conversation where BOTH parties actually messaged. A
-- conversation where the seller never replied has no response time, and
-- scoring it as "very slow" would punish sellers for buyers going quiet.
--
-- WHY THE SAMPLE-SIZE FLOOR: measured first-reply times on live data range
-- from 1 minute to 12 hours across three sampled conversations. With ~20
-- conversations on the platform a seller typically has 1-3 measurable
-- samples, and a "Usually replies in 12h" badge computed from n=2 would
-- routinely contradict what a buyer experiences. Below the floor the app
-- OMITS the field entirely rather than showing a number that is not yet real.
CREATE OR REPLACE FUNCTION public.get_seller_response_time(
  seller_uuid uuid,
  min_samples integer DEFAULT 5
)
RETURNS TABLE (
  median_minutes integer,
  sample_size integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH first_messages AS (
    SELECT
      c.id AS conversation_id,
      min(m.created_at) FILTER (WHERE m.sender_id = c.buyer_id)  AS buyer_first,
      min(m.created_at) FILTER (WHERE m.sender_id = c.seller_id) AS seller_first
    FROM public.conversations c
    JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.seller_id = seller_uuid
    GROUP BY c.id
  ),
  measured AS (
    SELECT
      extract(epoch FROM (seller_first - buyer_first)) / 60.0 AS minutes
    FROM first_messages
    WHERE buyer_first IS NOT NULL
      AND seller_first IS NOT NULL
      AND seller_first > buyer_first
  )
  SELECT
    CASE
      WHEN count(*) < least(greatest(min_samples, 1), 100)
        THEN NULL
      ELSE round(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes))::integer
    END AS median_minutes,
    count(*)::integer AS sample_size
  FROM measured;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_response_time(uuid, integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9) Verification (read-only; safe to leave in the migration)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_phone bigint;
  v_none  bigint;
BEGIN
  SELECT count(*) INTO v_phone
    FROM public.profiles WHERE verification_tier = 'phone_verified';
  SELECT count(*) INTO v_none
    FROM public.profiles WHERE verification_tier = 'none';
  RAISE NOTICE 'verification backfill: % phone_verified, % still none', v_phone, v_none;
END;
$$;
