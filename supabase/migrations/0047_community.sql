-- Community (forum) for Nigeria business, opportunities & everyday gist.
-- Reuses the existing chat (conversations/messages) by allowing listing-less
-- direct conversations between community members. No separate messaging system.

-- =============================================================================
-- 1) Community posts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN (
    'business',
    'deals-opportunities',
    'nigeria-gist',
    'cars-transport',
    'tech',
    'property',
    'jobs-career',
    'local-city'
  )),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  location text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed')),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  reply_count integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Engagement score for the Trending view (recomputed as counters change).
  engagement_score integer GENERATED ALWAYS AS (
    like_count + (reply_count * 3) + (view_count / 10)
  ) STORED
);

CREATE INDEX IF NOT EXISTS community_posts_channel_created_idx
  ON public.community_posts (channel, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS community_posts_created_idx
  ON public.community_posts (created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS community_posts_engagement_idx
  ON public.community_posts (engagement_score DESC, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON public.community_posts (author_id, created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_posts_public_select
  ON public.community_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY community_posts_auth_insert
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'published');

CREATE POLICY community_posts_author_update_delete
  ON public.community_posts FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.is_phone_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_phone_admin());

GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON TABLE public.community_posts TO service_role;

-- =============================================================================
-- 2) Community post images (optional, text-first)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.community_post_images (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0 AND position < 5),
  PRIMARY KEY (post_id, position)
);

CREATE INDEX IF NOT EXISTS community_post_images_post_idx
  ON public.community_post_images (post_id, position);

ALTER TABLE public.community_post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_images_public_select
  ON public.community_post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

CREATE POLICY community_images_auth_insert
  ON public.community_post_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

GRANT SELECT ON public.community_post_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_post_images TO authenticated;
GRANT ALL ON TABLE public.community_post_images TO service_role;
-- =============================================================================
-- 3) Community likes (idempotent toggle)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_post_likes_user_idx
  ON public.community_post_likes (user_id, created_at DESC);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_likes_public_select
  ON public.community_post_likes FOR SELECT USING (true);

CREATE POLICY community_likes_auth_insert
  ON public.community_post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY community_likes_auth_delete
  ON public.community_post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.community_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON TABLE public.community_post_likes TO service_role;

-- Keep community_posts.like_count in sync (poster sees live totals).
CREATE OR REPLACE FUNCTION public.sync_community_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.community_posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.community_posts
    SET like_count = greatest(0, like_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_community_like_created ON public.community_post_likes;
CREATE TRIGGER on_community_like_created
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_like_count();

-- =============================================================================
-- 4) Community replies (flat, single thread level like listing comments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_replies_post_created_idx
  ON public.community_replies (post_id, created_at ASC);

ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_replies_public_select
  ON public.community_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

CREATE POLICY community_replies_auth_insert
  ON public.community_replies FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

CREATE POLICY community_replies_author_delete
  ON public.community_replies FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_phone_admin());

GRANT SELECT ON public.community_replies TO anon, authenticated;
GRANT INSERT, DELETE ON public.community_replies TO authenticated;
GRANT ALL ON TABLE public.community_replies TO service_role;

-- =============================================================================
-- 5) Post view counter (rate-limited in the app via a cookie)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_community_post_view(post_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.community_posts
  SET view_count = view_count + 1
  WHERE id = post_uuid AND status = 'published';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO anon, authenticated;

-- =============================================================================
-- 6) Public community author lookup (name + location for display)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_community_authors_by_ids(author_uuids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  state text,
  city text,
  phone_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.state,
    p.city,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS phone_verified
  FROM public.profiles p
  WHERE p.id = ANY (author_uuids)
    AND coalesce(p.account_status, 'active') = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_community_authors_by_ids(uuid[]) TO anon, authenticated;

-- =============================================================================
-- 7) Storage: public community-images bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read community images" ON storage.objects;
CREATE POLICY "Public read community images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "Users upload own community images" ON storage.objects;
CREATE POLICY "Users upload own community images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own community images" ON storage.objects;
CREATE POLICY "Users delete own community images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Keep reply_count in sync + notify the post author on new replies.
CREATE OR REPLACE FUNCTION public.handle_community_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET reply_count = reply_count + 1, updated_at = now()
    WHERE id = NEW.post_id;

    IF post_author IS NOT NULL AND post_author <> NEW.author_id THEN
      PERFORM public.create_notification(
        post_author,
        'community_reply',
        'New reply in Community',
        left(btrim(NEW.body), 120),
        '/community/' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'reply_id', NEW.id, 'sender_id', NEW.author_id)
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET reply_count = greatest(0, reply_count - 1), updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_community_reply_created ON public.community_replies;
CREATE TRIGGER on_community_reply_created
  AFTER INSERT OR DELETE ON public.community_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_community_reply();

-- =============================================================================
-- 8) Reuse existing chat for community members (listing-less conversations)
-- =============================================================================

ALTER TABLE public.conversations ALTER COLUMN listing_id DROP NOT NULL;

-- One direct conversation per (buyer, seller) when not tied to a listing.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_community_buyer_seller_unique
  ON public.conversations (buyer_id, seller_id)
  WHERE listing_id IS NULL;

-- Allow inserting both listing conversations and listing-less community chats.
DROP POLICY IF EXISTS conversations_buyer_insert ON public.conversations;
CREATE POLICY conversations_buyer_insert
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() <> seller_id
    AND (
      (
        listing_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.listings l
          WHERE l.id = listing_id
            AND l.seller_id = seller_id
            AND l.status = 'approved'
        )
      )
      OR
      (listing_id IS NULL)
    )
  );

-- =============================================================================
-- 9) Notify types: allow community notifications
-- =============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'chat_message',
    'listing_comment',
    'security',
    'listing_approved',
    'listing_rejected',
    'listing_reported',
    'listing_expires_soon',
    'community_reply',
    'community_like'
  )
);

