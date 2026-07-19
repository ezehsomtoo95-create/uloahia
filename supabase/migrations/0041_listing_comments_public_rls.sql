-- Reaffirm listing_comments RLS: public SELECT; authenticated owner INSERT/UPDATE/DELETE.

GRANT SELECT ON TABLE public.listing_comments TO anon, authenticated;
GRANT INSERT, DELETE, UPDATE ON TABLE public.listing_comments TO authenticated;

ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_comments_select_public" ON public.listing_comments;
CREATE POLICY "listing_comments_select_public"
  ON public.listing_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "listing_comments_insert_authenticated" ON public.listing_comments;
CREATE POLICY "listing_comments_insert_authenticated"
  ON public.listing_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "listing_comments_delete_own" ON public.listing_comments;
CREATE POLICY "listing_comments_delete_own"
  ON public.listing_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "listing_comments_update_own" ON public.listing_comments;
CREATE POLICY "listing_comments_update_own"
  ON public.listing_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
