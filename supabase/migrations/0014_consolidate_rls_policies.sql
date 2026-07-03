-- =============================================================================
-- Consolidated RLS policies for AhiaUlo / uloahia
-- Lists RLS-enabled tables, drops all existing policies, recreates minimal set.
-- =============================================================================

-- 1) List all tables with RLS enabled (public + storage.objects)
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND c.relrowsecurity = true
  AND (
    n.nspname = 'public'
    OR (n.nspname = 'storage' AND c.relname = 'objects')
  )
ORDER BY n.nspname, c.relname;

-- 2) Drop every existing policy on RLS-enabled application tables
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END $$;

-- 3) Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- 4) Table grants (required alongside RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.listing_images TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.listing_images TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_listings TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_config TO authenticated;

-- =============================================================================
-- profiles
-- =============================================================================

CREATE POLICY profiles_auth_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_phone_admin());

CREATE POLICY profiles_auth_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_auth_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_admin_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

CREATE POLICY profiles_admin_delete
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_phone_admin());

-- =============================================================================
-- listings
-- =============================================================================

CREATE POLICY listings_anon_select_approved
  ON public.listings
  FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE POLICY listings_auth_select
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seller_id
    OR status = 'approved'
    OR public.is_phone_admin()
  );

CREATE POLICY listings_auth_insert_own
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND status = 'pending'
  );

CREATE POLICY listings_auth_update_own
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id OR public.is_phone_admin())
  WITH CHECK (auth.uid() = seller_id OR public.is_phone_admin());

CREATE POLICY listings_auth_delete_own
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id OR public.is_phone_admin());

-- =============================================================================
-- listing_images
-- =============================================================================

CREATE POLICY listing_images_anon_select_approved
  ON public.listing_images
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.status IN ('approved', 'pending')
    )
  );

CREATE POLICY listing_images_auth_select
  ON public.listing_images
  FOR SELECT
  TO authenticated
  USING (
    public.is_phone_admin()
    OR EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND (
          l.seller_id = auth.uid()
          OR l.status IN ('approved', 'pending')
        )
    )
  );

CREATE POLICY listing_images_auth_insert_own
  ON public.listing_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY listing_images_auth_delete_own
  ON public.listing_images
  FOR DELETE
  TO authenticated
  USING (
    public.is_phone_admin()
    OR EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.seller_id = auth.uid()
    )
  );

-- =============================================================================
-- saved_listings
-- =============================================================================

CREATE POLICY saved_listings_auth_select_own
  ON public.saved_listings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY saved_listings_auth_insert_own
  ON public.saved_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.status IN ('approved', 'pending')
    )
  );

CREATE POLICY saved_listings_auth_delete_own
  ON public.saved_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- reports
-- =============================================================================

CREATE POLICY reports_auth_insert_own
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY reports_admin_select
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.is_phone_admin());

CREATE POLICY reports_admin_update
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

CREATE POLICY reports_admin_delete
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (public.is_phone_admin());

-- =============================================================================
-- app_config (admin-only)
-- =============================================================================

CREATE POLICY app_config_admin_select
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (public.is_phone_admin());

CREATE POLICY app_config_admin_insert
  ON public.app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_phone_admin());

CREATE POLICY app_config_admin_update
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

-- =============================================================================
-- listing_views (RPC-only; deny direct client access)
-- =============================================================================

CREATE POLICY listing_views_deny_direct
  ON public.listing_views
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- storage.objects (listing-images bucket)
-- =============================================================================

CREATE POLICY storage_listing_images_anon_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-images');

CREATE POLICY storage_listing_images_auth_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY storage_listing_images_auth_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY storage_listing_images_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND public.is_phone_admin()
  );
