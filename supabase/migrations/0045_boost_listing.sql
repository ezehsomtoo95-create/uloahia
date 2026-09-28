-- =============================================================================
-- AhiaUlo Boost Listing — V1
-- -----------------------------------------------------------------------------
-- Adds the first monetization loop:
--   • boost_packages   – configurable paid visibility packages (price/duration)
--   • boost_payments   – reusable payment ledger (provider_reference is the
--                        Paystack transaction reference, used as idempotency key)
--   • boosts           – purchase/history records (listing-level)
--   • listings columns – boost_started_at / boost_expires_at for fast, derived
--                        "active boost" checks (no stale is_boosted boolean)
--
-- Design notes:
--   * Boost prices/durations live in boost_packages (DB), never hard-coded.
--   * A boost is active only while approved AND now() is within
--     [boost_started_at, boost_expires_at). Expiry is derived, never a frontend timer.
--   * Sellers cannot write the boost columns through existing RLS — column-level
--     UPDATE is revoked for authenticated. Activation happens server-side only.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Boost packages (configuration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.boost_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  description   text,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price_ngn     integer NOT NULL CHECK (price_ngn >= 0),
  currency      text NOT NULL DEFAULT 'NGN',
  is_active     boolean NOT NULL DEFAULT true,
  is_popular    boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed the three test packages. INSERT ... ON CONFLICT(name) keeps the file
-- idempotent if an admin later edits names/prices directly in the DB.
INSERT INTO public.boost_packages (name, description, duration_days, price_ngn, currency, is_active, is_popular, sort_order)
VALUES
  ('Starter', '3 days of boosted visibility',  3,  500,  'NGN', true, false, 10),
  ('Popular', '7 days of boosted visibility',  7,  1000, 'NGN', true, true,  20),
  ('Maximum', '14 days of boosted visibility', 14, 1500, 'NGN', true, false, 30)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.boost_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_packages FORCE ROW LEVEL SECURITY;

-- Packages are read by everyone (anon + authenticated) so sellers and the
-- server can look them up. Writes are service-role only (no auth policy).
GRANT SELECT ON public.boost_packages TO anon, authenticated;

DROP POLICY IF EXISTS "boost_packages_public_select" ON public.boost_packages;
CREATE POLICY "boost_packages_public_select"
  ON public.boost_packages
  FOR SELECT
  TO public
  USING (true);
-- -------------------------------------------------------------------------
-- 2. Boost payments (reusable payment ledger)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.boost_payments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id             uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  type                   text NOT NULL DEFAULT 'boost' CHECK (type IN ('boost')),
  package_id             uuid NOT NULL REFERENCES public.boost_packages(id),
  package_name           text NOT NULL,
  package_duration_days  integer NOT NULL,
  amount_ngn             integer NOT NULL CHECK (amount_ngn >= 0),
  currency               text NOT NULL DEFAULT 'NGN',
  provider               text NOT NULL DEFAULT 'paystack',
  provider_reference     text,
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'success', 'abandoned', 'failed')),
  raw_metadata           jsonb,
  paid_at                timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT boost_payments_unique_reference UNIQUE (provider_reference)
);

CREATE INDEX IF NOT EXISTS boost_payments_user_idx
  ON public.boost_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS boost_payments_listing_idx
  ON public.boost_payments (listing_id, created_at DESC);

ALTER TABLE public.boost_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_payments FORCE ROW LEVEL SECURITY;

-- Sellers may view their own payment records; inserts/updates are service-role only.
GRANT SELECT ON public.boost_payments TO authenticated;

DROP POLICY IF EXISTS "boost_payments_select_own" ON public.boost_payments;
CREATE POLICY "boost_payments_select_own"
  ON public.boost_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
-- ---------------------------------------------------------------------------
-- 3. Boosts (purchase records per listing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.boosts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  package_id  uuid REFERENCES public.boost_packages(id) ON DELETE SET NULL,
  payment_id  uuid REFERENCES public.boost_payments(id) ON DELETE SET NULL,
  start_at    timestamptz NOT NULL,
  expires_at  timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boosts_listing_idx
  ON public.boosts (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS boosts_active_idx
  ON public.boosts (expires_at) WHERE status = 'active';

ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosts FORCE ROW LEVEL SECURITY;

GRANT SELECT ON public.boosts TO authenticated;

DROP POLICY IF EXISTS "boosts_select_own" ON public.boosts;
CREATE POLICY "boosts_select_own"
  ON public.boosts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
-- ---------------------------------------------------------------------------
-- 4. Listings boost columns (derived active state)
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS boost_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz;

-- Fast queries for the Featured section + category/browse ranking lift.
CREATE INDEX IF NOT EXISTS listings_boost_active_idx
  ON public.listings (boost_expires_at)
  WHERE boost_expires_at IS NOT NULL;

-- Block sellers from self-setting boost columns through listings_update_own.
-- All boost activation goes through service-role only.
REVOKE UPDATE (boost_started_at, boost_expires_at) ON public.listings FROM authenticated;

-- ---------------------------------------------------------------------------
-- 6. Activation RPC — idempotent, transactional, service-role only
--    Called ONLY from server code after Paystack confirms the charge.
--    Guards: replay (status must be pending), unpaid, unowned / not approved
--    listings, and extends an existing active boost instead of overwriting.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_boost(payment_uuid uuid)
RETURNS public.boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.boost_payments%ROWTYPE;
  v_listing public.listings%ROWTYPE;
  v_start   timestamptz;
  v_expires timestamptz;
  v_boost   public.boosts;
BEGIN
  -- Lock the payment row so concurrent/replayed webhooks serialize.
  SELECT * INTO v_payment
  FROM public.boost_payments
  WHERE id = payment_uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  -- Idempotency: a payment is processed at most once.
  IF v_payment.status = 'success' THEN
    RETURN NULL;
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'payment_not_pending';
  END IF;

  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = v_payment.listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_listing.status <> 'approved' THEN
    RAISE EXCEPTION 'listing_not_boostaable';
  END IF;

  IF v_listing.seller_id <> v_payment.user_id THEN
    RAISE EXCEPTION 'listing_not_owned';
  END IF;

  v_start := now();
  -- Extend from the existing active boost expiry so re-boosts stack safely.
  v_expires := GREATEST(
    COALESCE(v_listing.boost_expires_at, now()),
    now()
  ) + make_interval(days => v_payment.package_duration_days);

  UPDATE public.listings
  SET boost_started_at = v_start,
      boost_expires_at = v_expires
  WHERE id = v_listing.id;

  UPDATE public.boost_payments
  SET status = 'success',
      paid_at = now(),
      updated_at = now()
  WHERE id = v_payment.id;

  INSERT INTO public.boosts (
    user_id, listing_id, package_id, payment_id, start_at, expires_at, status
  )
  VALUES (
    v_payment.user_id,
    v_payment.listing_id,
    v_payment.package_id,
    v_payment.id,
    v_start,
    v_expires,
    'active'
  )
  RETURNING * INTO v_boost;

  RETURN v_boost;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Helper RPC — authoritative "active boost expiry" for a listing
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.active_boost_expires_at(uuid);
CREATE OR REPLACE FUNCTION public.active_boost_expires_at(listing_uuid uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT l.boost_expires_at
  FROM public.listings l
  WHERE l.id = listing_uuid
    AND l.status = 'approved'
    AND l.boost_started_at <= now()
    AND l.boost_expires_at > now()
  LIMIT 1;
$$;