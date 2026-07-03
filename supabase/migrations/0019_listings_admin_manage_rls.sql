-- Ensure admin listing updates work via is_phone_admin() for authenticated sessions.
-- Also allow bootstrapping app_config.admin_phone so is_phone_admin() can evaluate correctly.

DROP POLICY IF EXISTS listings_admin_manage ON public.listings;
DROP POLICY IF EXISTS admin_can_update_listings ON public.listings;

CREATE POLICY listings_admin_manage
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS app_config_bootstrap_admin_phone ON public.app_config;

CREATE POLICY app_config_bootstrap_admin_phone
  ON public.app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    key = 'admin_phone'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND public.normalize_listing_phone(profiles.phone) = public.normalize_listing_phone(value)
    )
  );

DROP POLICY IF EXISTS app_config_bootstrap_admin_phone_update ON public.app_config;

CREATE POLICY app_config_bootstrap_admin_phone_update
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (
    key = 'admin_phone'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND public.normalize_listing_phone(profiles.phone) = public.normalize_listing_phone(value)
    )
  )
  WITH CHECK (
    key = 'admin_phone'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND public.normalize_listing_phone(profiles.phone) = public.normalize_listing_phone(value)
    )
  );

GRANT EXECUTE ON FUNCTION public.is_phone_admin() TO authenticated;
