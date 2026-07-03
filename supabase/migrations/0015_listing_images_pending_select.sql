-- Allow listing images to be read when parent listing is approved or pending.

DROP POLICY IF EXISTS listing_images_anon_select_approved ON public.listing_images;

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

DROP POLICY IF EXISTS listing_images_auth_select ON public.listing_images;

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
