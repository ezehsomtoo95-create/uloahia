-- Ensure admin listing updates work via is_phone_admin() for authenticated sessions.

DROP POLICY IF EXISTS listings_admin_manage ON public.listings;
DROP POLICY IF EXISTS admin_can_update_listings ON public.listings;

CREATE POLICY listings_admin_manage
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

GRANT EXECUTE ON FUNCTION public.is_phone_admin() TO authenticated;
