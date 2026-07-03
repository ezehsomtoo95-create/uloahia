-- Allow saving listings that are approved or pending.

DROP POLICY IF EXISTS saved_listings_auth_insert_own ON public.saved_listings;

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

-- SELECT and DELETE policies unchanged (re-assert for idempotency)
DROP POLICY IF EXISTS saved_listings_auth_select_own ON public.saved_listings;

CREATE POLICY saved_listings_auth_select_own
  ON public.saved_listings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_listings_auth_delete_own ON public.saved_listings;

CREATE POLICY saved_listings_auth_delete_own
  ON public.saved_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
