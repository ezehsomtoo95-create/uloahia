-- Public comment reads for everyone (anon + authenticated).
-- Owner-only write policies remain for authenticated users.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.listing_comments TO anon, authenticated, public;
GRANT INSERT, UPDATE, DELETE ON TABLE public.listing_comments TO authenticated;

ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments FORCE ROW LEVEL SECURITY;

-- Drop prior select policies (name variants)
DROP POLICY IF EXISTS "listing_comments_select_public" ON public.listing_comments;
DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON public.listing_comments;
DROP POLICY IF EXISTS "listing_comments_select_authenticated" ON public.listing_comments;

CREATE POLICY "Public comments are viewable by everyone"
  ON public.listing_comments
  FOR SELECT
  TO public
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
