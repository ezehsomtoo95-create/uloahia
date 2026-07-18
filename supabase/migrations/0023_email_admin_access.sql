-- Email-based admin access (replaces phone-number admin checks).

CREATE OR REPLACE FUNCTION public.get_admin_email_setting()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(current_setting('app.admin_email', true), ''),
    (SELECT value FROM public.app_config WHERE key = 'admin_email' LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_email_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = lower(public.get_admin_email_setting())
  );
$$;

-- Keep existing policies working while switching the check to email.
CREATE OR REPLACE FUNCTION public.is_phone_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_email_admin() OR public.is_admin();
$$;

INSERT INTO public.app_config (key, value)
VALUES ('admin_email', 'ezehsomtoo95@gmail.com')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

DROP POLICY IF EXISTS app_config_bootstrap_admin_email ON public.app_config;

CREATE POLICY app_config_bootstrap_admin_email
  ON public.app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    key = 'admin_email'
    AND lower(value) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS app_config_bootstrap_admin_email_update ON public.app_config;

CREATE POLICY app_config_bootstrap_admin_email_update
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (
    key = 'admin_email'
    AND lower(value) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    key = 'admin_email'
    AND lower(value) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

GRANT EXECUTE ON FUNCTION public.is_email_admin() TO authenticated;
