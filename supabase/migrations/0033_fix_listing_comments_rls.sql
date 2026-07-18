-- =============================================================================
-- FAIL-PROOF FIX: listing_comments RLS + grants
-- Paste into Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- 1) Ensure table exists (safe if already created)
CREATE TABLE IF NOT EXISTS public.listing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_comments_listing_created_idx
  ON public.listing_comments (listing_id, created_at DESC);

-- 2) Table privileges (required even when RLS policies exist)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.listing_comments TO anon, authenticated;
GRANT INSERT, DELETE, UPDATE ON TABLE public.listing_comments TO authenticated;

-- 3) Enable RLS
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments FORCE ROW LEVEL SECURITY;

-- 4) Drop every existing policy on this table (start clean)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listing_comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.listing_comments', pol.policyname);
  END LOOP;
END $$;

-- 5) Public read
CREATE POLICY "listing_comments_select_public"
  ON public.listing_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6) Authenticated insert — column is author_id (NOT user_id)
CREATE POLICY "listing_comments_insert_authenticated"
  ON public.listing_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 7) Authors can delete their own comments
CREATE POLICY "listing_comments_delete_own"
  ON public.listing_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- 8) Authors can update their own comments (optional; keeps future edits working)
CREATE POLICY "listing_comments_update_own"
  ON public.listing_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
