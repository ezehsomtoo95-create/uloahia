-- 1. Drop functions and dependent policies using CASCADE
-- CASCADE will also remove the RLS policies that rely on these functions
DROP FUNCTION IF EXISTS public.normalize_listing_phone(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_phone_setting() CASCADE;
DROP FUNCTION IF EXISTS public.is_phone_admin() CASCADE;

-- 2. Re-create the functions
CREATE OR REPLACE FUNCTION public.normalize_listing_phone(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    case
      when input is null then null
      when regexp_replace(input, '\D', '', 'g') like '234%' then
        '0' || substring(regexp_replace(input, '\D', '', 'g') from 4)
      else
        regexp_replace(input, '\D', '', 'g')
    end
$$;

CREATE OR REPLACE FUNCTION public.get_admin_phone_setting()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(current_setting('app.admin_phone', true), ''),
    (select value from public.app_config where key = 'admin_phone' limit 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_phone_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND public.normalize_listing_phone(phone) = public.normalize_listing_phone(
        public.get_admin_phone_setting()
      )
  );
$$;

-- 3. Re-create the admin policies
CREATE POLICY "admin_can_update_listings" ON public.listings FOR UPDATE TO authenticated 
USING (public.is_phone_admin()) WITH CHECK (true);

CREATE POLICY "admin_can_delete_listings" ON public.listings FOR DELETE TO authenticated 
USING (public.is_phone_admin());

CREATE POLICY "admin_can_delete_listing_images" ON public.listing_images FOR DELETE TO authenticated 
USING (public.is_phone_admin());

CREATE POLICY "listings_phone_admin_select" ON public.listings FOR SELECT TO authenticated 
USING (public.is_phone_admin());

CREATE POLICY "listing_images_phone_admin_select" ON public.listing_images FOR SELECT TO authenticated 
USING (public.is_phone_admin());

-- 4. Set grants
GRANT UPDATE, DELETE ON public.listings TO authenticated;
GRANT DELETE ON public.listing_images TO authenticated;