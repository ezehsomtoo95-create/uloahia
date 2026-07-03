-- Fix profiles RLS for client UPSERT (insert + on-conflict update).
-- UPSERT requires both INSERT and UPDATE policies; UPDATE needs matching USING and WITH CHECK.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

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
