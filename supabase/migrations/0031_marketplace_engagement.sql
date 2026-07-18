-- Marketplace engagement: profiles (shop), chat, notifications, report reasons.
-- Does not alter category/location/search architecture.

-- ---------------------------------------------------------------------------
-- Profiles: shop username, avatar, pending-phone support for OAuth
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_pending_phone(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT value IS NULL OR btrim(value) = '' OR value LIKE 'pending:%';
$$;

CREATE OR REPLACE FUNCTION public.profile_phone_is_complete(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT public.is_pending_phone(value);
$$;

CREATE OR REPLACE FUNCTION public.slugify_username(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := lower(coalesce(raw, ''));
  cleaned := regexp_replace(cleaned, '[^a-z0-9]+', '-', 'g');
  cleaned := regexp_replace(cleaned, '(^-+|-+$)', '', 'g');
  cleaned := left(cleaned, 24);
  IF cleaned = '' OR length(cleaned) < 3 THEN
    RETURN NULL;
  END IF;
  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_unique_username(preferred text, seed uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix text;
  attempt integer := 0;
BEGIN
  base := public.slugify_username(preferred);
  IF base IS NULL THEN
    base := 'seller';
  END IF;

  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(candidate)
  ) LOOP
    attempt := attempt + 1;
    suffix := substr(replace(seed::text, '-', ''), 1, 4) || attempt::text;
    candidate := left(base, greatest(3, 24 - length(suffix) - 1)) || '-' || suffix;
    IF attempt > 40 THEN
      candidate := 'u' || substr(replace(seed::text, '-', ''), 1, 12);
      EXIT;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata_phone text;
  resolved_phone text;
  resolved_name text;
  resolved_avatar text;
  resolved_username text;
  preferred_username text;
BEGIN
  metadata_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  resolved_phone := nullif(trim(coalesce(new.phone, metadata_phone, '')), '');

  -- Google / OAuth users may not have a phone yet — store a unique pending sentinel.
  IF resolved_phone IS NULL THEN
    resolved_phone := 'pending:' || new.id::text;
  END IF;

  resolved_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        ''
      )
    ),
    ''
  );

  resolved_avatar := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        ''
      )
    ),
    ''
  );

  preferred_username := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    resolved_name,
    split_part(coalesce(new.email, ''), '@', 1)
  );
  resolved_username := public.allocate_unique_username(preferred_username, new.id);

  INSERT INTO public.profiles (id, phone, full_name, avatar_url, username)
  VALUES (
    new.id,
    resolved_phone,
    resolved_name,
    resolved_avatar,
    resolved_username
  )
  ON CONFLICT (id) DO UPDATE
    SET phone = CASE
          WHEN public.is_pending_phone(public.profiles.phone)
            THEN excluded.phone
          ELSE public.profiles.phone
        END,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        username = coalesce(public.profiles.username, excluded.username);

  RETURN new;
END;
$$;

-- Public seller shop read (limited fields only)
CREATE OR REPLACE FUNCTION public.get_public_seller_by_username(shop_username text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  state text,
  city text,
  created_at timestamptz,
  phone_verified boolean,
  active_listing_count integer,
  total_views bigint
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
    p.created_at,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS phone_verified,
    (
      SELECT count(*)::integer
      FROM public.listings l
      WHERE l.seller_id = p.id AND l.status = 'approved'
    ) AS active_listing_count,
    (
      SELECT coalesce(sum(l.views), 0)::bigint
      FROM public.listings l
      WHERE l.seller_id = p.id
    ) AS total_views
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND lower(p.username) = lower(trim(shop_username))
    AND coalesce(p.account_status, 'active') = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller_by_username(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_seller_by_id(seller_uuid uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  state text,
  city text,
  created_at timestamptz,
  phone_verified boolean,
  active_listing_count integer,
  total_views bigint
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
    p.created_at,
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS phone_verified,
    (
      SELECT count(*)::integer
      FROM public.listings l
      WHERE l.seller_id = p.id AND l.status = 'approved'
    ) AS active_listing_count,
    (
      SELECT coalesce(sum(l.views), 0)::bigint
      FROM public.listings l
      WHERE l.seller_id = p.id
    ) AS total_views
  FROM public.profiles p
  WHERE p.id = seller_uuid
    AND coalesce(p.account_status, 'active') = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seller_by_id(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Conversations / messages (lightweight chat)
-- Block/report columns prepared for later — not exposed in UI yet.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  buyer_unread_count integer NOT NULL DEFAULT 0 CHECK (buyer_unread_count >= 0),
  seller_unread_count integer NOT NULL DEFAULT 0 CHECK (seller_unread_count >= 0),
  buyer_blocked_at timestamptz,
  seller_blocked_at timestamptz,
  reported_at timestamptz,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_participants CHECK (buyer_id <> seller_id),
  CONSTRAINT conversations_listing_buyer_unique UNIQUE (listing_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS conversations_buyer_idx
  ON public.conversations (buyer_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS conversations_seller_idx
  ON public.conversations (seller_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS conversations_listing_idx
  ON public.conversations (listing_id);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON public.messages (conversation_id, created_at ASC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;
GRANT ALL ON TABLE public.messages TO service_role;

DROP POLICY IF EXISTS conversations_participant_select ON public.conversations;
CREATE POLICY conversations_participant_select
  ON public.conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS conversations_buyer_insert ON public.conversations;
CREATE POLICY conversations_buyer_insert
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() <> seller_id
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.seller_id = seller_id
        AND l.status = 'approved'
    )
  );

DROP POLICY IF EXISTS conversations_participant_update ON public.conversations;
CREATE POLICY conversations_participant_update
  ON public.conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin())
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS messages_participant_select ON public.messages;
CREATE POLICY messages_participant_select
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS messages_participant_insert ON public.messages;
CREATE POLICY messages_participant_insert
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND c.buyer_blocked_at IS NULL
        AND c.seller_blocked_at IS NULL
    )
  );

DROP POLICY IF EXISTS messages_participant_update ON public.messages;
CREATE POLICY messages_participant_update
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'chat_message',
      'listing_approved',
      'listing_rejected',
      'listing_reported',
      'listing_expires_soon'
    )
  ),
  title text NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Inserts happen via security definer helpers / service role; allow own system inserts via definer.
DROP POLICY IF EXISTS notifications_insert_system ON public.notifications;
CREATE POLICY notifications_insert_system
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text DEFAULT NULL,
  notification_link text DEFAULT NULL,
  notification_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  VALUES (
    target_user_id,
    notification_type,
    notification_title,
    notification_body,
    notification_link,
    coalesce(notification_data, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb) TO authenticated, service_role;

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
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.body), 140);

  IF NEW.sender_id = conv.buyer_id THEN
    recipient := conv.seller_id;
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      last_message_preview = preview,
      seller_unread_count = seller_unread_count + 1
    WHERE id = conv.id;
  ELSE
    recipient := conv.buyer_id;
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

CREATE OR REPLACE FUNCTION public.mark_conversation_read(conversation_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.conversations%ROWTYPE;
BEGIN
  SELECT * INTO conv
  FROM public.conversations
  WHERE id = conversation_uuid
    AND (buyer_id = auth.uid() OR seller_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF auth.uid() = conv.buyer_id THEN
    UPDATE public.conversations
    SET buyer_last_read_at = now(), buyer_unread_count = 0
    WHERE id = conv.id;

    UPDATE public.messages
    SET read_at = coalesce(read_at, now())
    WHERE conversation_id = conv.id
      AND sender_id = conv.seller_id
      AND read_at IS NULL;
  ELSE
    UPDATE public.conversations
    SET seller_last_read_at = now(), seller_unread_count = 0
    WHERE id = conv.id;

    UPDATE public.messages
    SET read_at = coalesce(read_at, now())
    WHERE conversation_id = conv.id
      AND sender_id = conv.buyer_id
      AND read_at IS NULL;
  END IF;

  UPDATE public.notifications
  SET read_at = coalesce(read_at, now())
  WHERE user_id = auth.uid()
    AND type = 'chat_message'
    AND read_at IS NULL
    AND (data->>'conversation_id') = conversation_uuid::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- Report reasons are validated in the app layer (Scam, Duplicate, etc.).
-- Admin review UI already exists for the reports table.

CREATE OR REPLACE FUNCTION public.notify_seller_of_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller uuid;
  listing_title text;
BEGIN
  SELECT l.seller_id, l.title
  INTO seller, listing_title
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  IF seller IS NULL OR seller = NEW.reporter_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    seller,
    'listing_reported',
    'Your listing was reported',
    coalesce(listing_title, 'A listing') || ' was flagged for review.',
    '/my-listings',
    jsonb_build_object(
      'listing_id', NEW.listing_id,
      'report_id', NEW.id,
      'reason', NEW.reason
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_seller_of_report();

-- Backfill usernames for existing profiles missing one
DO $$
DECLARE
  profile_row record;
BEGIN
  FOR profile_row IN
    SELECT id, full_name
    FROM public.profiles
    WHERE username IS NULL
  LOOP
    UPDATE public.profiles
    SET username = public.allocate_unique_username(profile_row.full_name, profile_row.id)
    WHERE id = profile_row.id;
  END LOOP;
END $$;
