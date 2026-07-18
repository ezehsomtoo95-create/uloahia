-- Remove self-promotion paths for app_config.admin_phone.
-- Admin phone is seeded server-side via service role only.

DROP POLICY IF EXISTS app_config_bootstrap_admin_phone ON public.app_config;
DROP POLICY IF EXISTS app_config_bootstrap_admin_phone_update ON public.app_config;
DROP POLICY IF EXISTS app_config_admin_seed ON public.app_config;
DROP POLICY IF EXISTS "app_config_admin_seed" ON public.app_config;

-- Replace legacy self-service update policy (0005) if it still exists.
DROP POLICY IF EXISTS app_config_admin_update ON public.app_config;

CREATE POLICY app_config_admin_update
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());
