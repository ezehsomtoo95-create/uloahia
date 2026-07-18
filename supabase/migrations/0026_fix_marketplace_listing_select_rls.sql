-- Fix marketplace feed visibility for authenticated users.
-- Symptom: approved listings visible to anon, but empty after sign-in.
-- Cause: role-split SELECT policies can leave authenticated without approved access.

-- Ensure admin helper functions are safe to evaluate inside RLS policies.
CREATE OR REPLACE FUNCTION public.is_phone_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_email_admin() OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_phone_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_admin() TO authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT SELECT ON public.listing_images TO anon, authenticated;

-- listings: public approved feed + own listings + admin
DROP POLICY IF EXISTS listings_anon_select_approved ON public.listings;
DROP POLICY IF EXISTS listings_auth_select ON public.listings;
DROP POLICY IF EXISTS listings_public_approved_select ON public.listings;
DROP POLICY IF EXISTS listings_phone_admin_select ON public.listings;
DROP POLICY IF EXISTS listings_public_select_approved ON public.listings;
DROP POLICY IF EXISTS listings_auth_select_own ON public.listings;
DROP POLICY IF EXISTS listings_admin_select ON public.listings;

CREATE POLICY listings_public_select_approved
  ON public.listings
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY listings_auth_select_own
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY listings_admin_select
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (public.is_phone_admin());

-- listing_images: approved feed + own listing images + admin
DROP POLICY IF EXISTS listing_images_anon_select_approved ON public.listing_images;
DROP POLICY IF EXISTS listing_images_auth_select ON public.listing_images;
DROP POLICY IF EXISTS listing_images_phone_admin_select ON public.listing_images;
DROP POLICY IF EXISTS listing_images_public_select_approved ON public.listing_images;
DROP POLICY IF EXISTS listing_images_auth_select_own ON public.listing_images;
DROP POLICY IF EXISTS listing_images_admin_select ON public.listing_images;

CREATE POLICY listing_images_public_select_approved
  ON public.listing_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.status = 'approved'
    )
  );

CREATE POLICY listing_images_auth_select_own
  ON public.listing_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY listing_images_admin_select
  ON public.listing_images
  FOR SELECT
  TO authenticated
  USING (public.is_phone_admin());
