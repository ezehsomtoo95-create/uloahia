-- Analytics events for admin dashboard charts (signup + listing create).
-- Dashboard KPIs still derive totals from profiles/listings; this table
-- powers reliable day-bucketed series and backfills from existing rows.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('new_user_signup', 'listing_created')),
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS analytics_events_type_created_idx
  ON public.analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx
  ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.is_email_admin() OR public.is_admin());

GRANT SELECT ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;

-- Backfill once (idempotent via NOT EXISTS)
INSERT INTO public.analytics_events (event_type, entity_id, created_at)
SELECT 'new_user_signup', p.id, p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.analytics_events e
  WHERE e.event_type = 'new_user_signup'
    AND e.entity_id = p.id
);

INSERT INTO public.analytics_events (event_type, entity_id, created_at)
SELECT 'listing_created', l.id, l.created_at
FROM public.listings l
WHERE NOT EXISTS (
  SELECT 1
  FROM public.analytics_events e
  WHERE e.event_type = 'listing_created'
    AND e.entity_id = l.id
);

CREATE OR REPLACE FUNCTION public.log_analytics_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_type, entity_id, created_at, meta)
  VALUES (
    'new_user_signup',
    NEW.id,
    COALESCE(NEW.created_at, now()),
    jsonb_build_object('source', 'profiles_trigger')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_analytics_listing_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_type, entity_id, created_at, meta)
  VALUES (
    'listing_created',
    NEW.id,
    COALESCE(NEW.created_at, now()),
    jsonb_build_object('source', 'listings_trigger', 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_analytics_event ON public.profiles;
CREATE TRIGGER on_profile_analytics_event
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_analytics_new_user();

DROP TRIGGER IF EXISTS on_listing_analytics_event ON public.listings;
CREATE TRIGGER on_listing_analytics_event
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_analytics_listing_created();
