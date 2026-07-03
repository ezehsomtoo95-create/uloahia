-- 1. Drop functions and dependent policies using CASCADE
DROP FUNCTION IF EXISTS public.normalize_listing_phone(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_phone_admin() CASCADE;

-- 2. Re-create the functions
CREATE OR REPLACE FUNCTION public.normalize_listing_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    regexp_replace(coalesce(phone, ''), '\D', '', 'g'),
    '^234',
    '0'
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
    FROM public.profiles p
    INNER JOIN public.app_config c ON c.key = 'admin_phone'
    WHERE p.id = auth.uid()
      AND public.normalize_listing_phone(p.phone) = public.normalize_listing_phone(c.value)
  );
$$;

-- 3. Re-create the admin policies
DROP POLICY IF EXISTS "listings_phone_admin_update" ON public.listings;
CREATE POLICY "listings_phone_admin_update" ON public.listings FOR UPDATE TO authenticated USING (public.is_phone_admin()) WITH CHECK (true);

DROP POLICY IF EXISTS "listings_phone_admin_delete" ON public.listings;
CREATE POLICY "listings_phone_admin_delete" ON public.listings FOR DELETE TO authenticated USING (public.is_phone_admin());

DROP POLICY IF EXISTS "listing_images_phone_admin_delete" ON public.listing_images;
CREATE POLICY "listing_images_phone_admin_delete" ON public.listing_images FOR DELETE TO authenticated USING (public.is_phone_admin());

DROP POLICY IF EXISTS "listings_phone_admin_select" ON public.listings;
CREATE POLICY "listings_phone_admin_select" ON public.listings FOR SELECT TO authenticated USING (public.is_phone_admin());

DROP POLICY IF EXISTS "listing_images_phone_admin_select" ON public.listing_images;
CREATE POLICY "listing_images_phone_admin_select" ON public.listing_images FOR SELECT TO authenticated USING (public.is_phone_admin());

-- 4. Ensure permissions
GRANT UPDATE, DELETE ON public.listings TO authenticated;
GRANT DELETE ON public.listing_images TO authenticated;