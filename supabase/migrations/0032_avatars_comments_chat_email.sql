-- Avatars storage, listing comments, and chat email notify hooks.

-- 1) Public avatars bucket (user profile pictures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2) Listing discussion comments
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

CREATE INDEX IF NOT EXISTS listing_comments_flagged_idx
  ON public.listing_comments (is_flagged)
  WHERE is_flagged = true;

ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read listing comments" ON public.listing_comments;
CREATE POLICY "Public read listing comments"
  ON public.listing_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND (l.status = 'approved' OR l.seller_id = auth.uid() OR public.is_phone_admin())
    )
  );

DROP POLICY IF EXISTS "Authenticated insert listing comments" ON public.listing_comments;
CREATE POLICY "Authenticated insert listing comments"
  ON public.listing_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Authors delete own listing comments" ON public.listing_comments;
CREATE POLICY "Authors delete own listing comments"
  ON public.listing_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_phone_admin());

DROP POLICY IF EXISTS "Admins flag listing comments" ON public.listing_comments;
CREATE POLICY "Admins flag listing comments"
  ON public.listing_comments FOR UPDATE TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

-- Keep comment inserts lightweight; admins can query listing_comments.is_flagged.
CREATE OR REPLACE FUNCTION public.log_listing_comment_for_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_comment_created ON public.listing_comments;
CREATE TRIGGER on_listing_comment_created
  AFTER INSERT ON public.listing_comments
  FOR EACH ROW EXECUTE FUNCTION public.log_listing_comment_for_moderation();

-- 3) Chat email when recipient appears inactive (5+ minutes since last read)
CREATE OR REPLACE FUNCTION public.invoke_user_notify(
  notify_type text,
  notify_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  notify_url text;
  notify_secret text;
BEGIN
  SELECT value INTO notify_url FROM public.app_config WHERE key = 'user_notify_function_url' LIMIT 1;
  IF notify_url IS NULL OR length(trim(notify_url)) = 0 THEN
    SELECT value INTO notify_url FROM public.app_config WHERE key = 'admin_notify_function_url' LIMIT 1;
  END IF;

  SELECT value INTO notify_secret FROM public.app_config WHERE key = 'admin_notify_secret' LIMIT 1;

  IF notify_url IS NULL OR notify_secret IS NULL OR length(trim(notify_url)) = 0 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := notify_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || notify_secret
    ),
    body := jsonb_build_object(
      'type', notify_type,
      'details', notify_details
    ),
    timeout_milliseconds := 5000
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'user-notify invoke failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.conversations%ROWTYPE;
  recipient uuid;
  preview text;
  last_read timestamptz;
  recipient_email text;
  is_inactive boolean := true;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.body), 140);

  IF NEW.sender_id = conv.buyer_id THEN
    recipient := conv.seller_id;
    last_read := conv.seller_last_read_at;
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      last_message_preview = preview,
      seller_unread_count = seller_unread_count + 1
    WHERE id = conv.id;
  ELSE
    recipient := conv.buyer_id;
    last_read := conv.buyer_last_read_at;
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      last_message_preview = preview,
      buyer_unread_count = buyer_unread_count + 1
    WHERE id = conv.id;
  END IF;

  PERFORM public.create_notification(
    recipient,
    'chat_message',
    'New message',
    preview,
    '/messages/' || conv.id::text,
    jsonb_build_object(
      'conversation_id', conv.id,
      'listing_id', conv.listing_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    )
  );

  -- Offline / inactive: no recent read activity in this thread (5 minutes).
  is_inactive := last_read IS NULL OR last_read < (now() - interval '5 minutes');

  IF is_inactive THEN
    SELECT email INTO recipient_email FROM auth.users WHERE id = recipient;

    IF recipient_email IS NOT NULL AND length(trim(recipient_email)) > 0 THEN
      PERFORM public.invoke_user_notify(
        'chat_message_email',
        jsonb_build_object(
          'to_email', recipient_email,
          'conversation_id', conv.id,
          'listing_id', conv.listing_id,
          'message_preview', preview
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
