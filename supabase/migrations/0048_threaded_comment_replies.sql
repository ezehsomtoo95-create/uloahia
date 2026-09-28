-- Threaded comment/reply support for listing comments and community posts.
-- Adds parent_id to listing_comments and community_replies, plus notification
-- triggers that notify the specific person being replied to (not the post/listing owner).

-- =============================================================================
-- 1) Self-referencing parent_id for listing comments (threaded replies)
-- =============================================================================

ALTER TABLE public.listing_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.listing_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS listing_comments_parent_idx
  ON public.listing_comments (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL;

-- =============================================================================
-- 2) Self-referencing parent_id for community replies (threaded replies)
-- =============================================================================

ALTER TABLE public.community_replies
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_replies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS community_replies_parent_idx
  ON public.community_replies (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL;

-- =============================================================================
-- 3) Notification types: add listing_comment_reply (community_reply already exists)
-- =============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'chat_message',
    'listing_comment',
    'listing_comment_reply',
    'security',
    'listing_approved',
    'listing_rejected',
    'listing_reported',
    'listing_expires_soon',
    'community_reply',
    'community_like'
  )
);

-- =============================================================================
-- 4) Notify the comment author when someone replies to their listing comment
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_comment_author_on_listing_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  parent_comment record;
  preview text;
  recipient_email text;
  listing_title text;
BEGIN
  -- Only fire for replies (rows that have a parent_id)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the parent comment to find who to notify
  SELECT lc.id, lc.author_id, lc.listing_id, l.title
  INTO parent_comment
  FROM public.listing_comments lc
  JOIN public.listings l ON l.id = lc.listing_id
  WHERE lc.id = NEW.parent_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Do not notify the author about their own reply
  IF parent_comment.author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.body), 140);

  -- In-app notification with deep link to the listing and the parent comment
  PERFORM public.create_notification(
    parent_comment.author_id,
    'listing_comment_reply',
    'New reply to your comment',
    preview,
    '/listing/' || parent_comment.listing_id::text || '?comment=' || NEW.parent_id::text,
    jsonb_build_object(
      'listing_id', parent_comment.listing_id,
      'comment_id', NEW.parent_id,
      'reply_id', NEW.id,
      'author_id', NEW.author_id
    )
  );

  -- Email notification (for inactive users)
  SELECT email
    INTO recipient_email FROM auth.users WHERE id = parent_comment.author_id;

  IF recipient_email IS NOT NULL AND length(trim(recipient_email)) > 0 THEN
    listing_title := parent_comment.title;

    PERFORM public.invoke_user_notify(
      'listing_comment_reply_email',
      jsonb_build_object(
        'to_email', recipient_email,
        'link', '/listing/' || parent_comment.listing_id::text || '?comment=' || NEW.parent_id::text,
        'listing_title', listing_title,
        'comment_preview', preview,
        'reply_id', NEW.id,
        'parent_comment_id', NEW.parent_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_comment_reply_created ON public.listing_comments;
CREATE TRIGGER on_listing_comment_reply_created
  AFTER INSERT ON public.listing_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_author_on_listing_comment_reply();

-- =============================================================================
-- 5) Update community reply trigger to notify the specific reply author when
--    someone replies to their community reply (not just the post author)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_community_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
  parent_reply_author uuid;
  preview text;
  recipient uuid;
  recipient_email text;
BEGIN
  -- Fetch the post author (for top-level replies)
  SELECT author_id INTO post_author
  FROM public.community_posts
  WHERE id = NEW.post_id;

  -- Fetch the parent reply author (for nested replies)
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_reply_author
    FROM public.community_replies
    WHERE id = NEW.parent_id;
  END IF;

  -- Determine who to notify: the parent reply author (if replying to a reply),
  -- otherwise the post author (top-level reply)
  recipient := NULL;
  IF NEW.parent_id IS NOT NULL THEN
    recipient := parent_reply_author;
  ELSE
    recipient := post_author;
  END IF;

  -- Keep reply_count in sync
  UPDATE public.community_posts
  SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.post_id;

  -- Notify the appropriate person (not the replier)
  IF recipient IS NOT NULL AND recipient <> NEW.author_id THEN
    preview := left(btrim(NEW.body), 120);

    -- Deep link to the post and parent reply
    PERFORM public.create_notification(
      recipient,
      'community_reply',
      'New reply in Community',
      preview,
      '/community/' || NEW.post_id::text || '?reply=' || COALESCE(NEW.parent_id, NEW.id)::text,
      jsonb_build_object(
        'post_id', NEW.post_id,
        'reply_id', NEW.id,
        'sender_id', NEW.author_id,
        'parent_reply_id', NEW.parent_id
      )
    );

    -- Email notification
    SELECT email INTO recipient_email FROM auth.users WHERE id = recipient;

    IF recipient_email IS NOT NULL AND length(trim(recipient_email)) > 0 THEN
      PERFORM public.invoke_user_notify(
        'community_reply_email',
        jsonb_build_object(
          'to_email', recipient_email,
          'link', '/community/' || NEW.post_id::text || '?reply=' || COALESCE(NEW.parent_id, NEW.id)::text,
          'post_id', NEW.post_id,
          'reply_preview', preview,
          'reply_id', NEW.id,
          'parent_reply_id', NEW.parent_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
