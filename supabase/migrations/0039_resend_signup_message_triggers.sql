-- Resend email triggers via admin-notify Edge Function.
--
-- Requires Edge Function secrets:
--   RESEND_API_KEY, ADMIN_NOTIFY_SECRET
-- Optional:
--   ADMIN_EMAIL, FROM_EMAIL
--
-- Requires app_config (run in SQL editor after deploy):
--   INSERT INTO public.app_config (key, value) VALUES
--     ('admin_notify_function_url', 'https://<project-ref>.supabase.co/functions/v1/admin-notify'),
--     ('admin_notify_secret', '<same as Edge secret ADMIN_NOTIFY_SECRET>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Keep invoke helpers aligned with x-admin-notify-secret auth.
CREATE OR REPLACE FUNCTION public.invoke_admin_notify(
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
  request_id bigint;
BEGIN
  SELECT value INTO notify_url
  FROM public.app_config
  WHERE key = 'admin_notify_function_url'
  LIMIT 1;

  SELECT value INTO notify_secret
  FROM public.app_config
  WHERE key = 'admin_notify_secret'
  LIMIT 1;

  IF notify_url IS NULL OR notify_secret IS NULL
     OR length(trim(notify_url)) = 0
     OR length(trim(notify_secret)) = 0 THEN
    RAISE WARNING 'admin-notify skipped: configure app_config admin_notify_function_url and admin_notify_secret';
    RETURN;
  END IF;

  BEGIN
    SELECT net.http_post(
      url := notify_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-admin-notify-secret', notify_secret
      ),
      body := jsonb_build_object(
        'type', notify_type,
        'details', notify_details
      ),
      timeout_milliseconds := 5000
    )
    INTO request_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'admin-notify: net.http_post failed. type=%, error=%', notify_type, SQLERRM;
      RETURN;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'admin-notify invoke failed: %', SQLERRM;
END;
$$;

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
      'x-admin-notify-secret', notify_secret
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

-- 1) New signup → email admin (fires on auth.users INSERT)
CREATE OR REPLACE FUNCTION public.notify_admin_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  PERFORM public.invoke_admin_notify(
    'new_signup',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'created_at', NEW.created_at,
      'email_confirmed_at', NEW.email_confirmed_at,
      'message', format('New AhiaUlo signup: %s', COALESCE(NEW.email, NEW.id::text))
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_admin_notify ON auth.users;
CREATE TRIGGER on_auth_user_admin_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_auth_user_created();

-- 2) New chat message → email the listing seller (buyer → seller)
--    Also keeps in-app notification for the conversation recipient.
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  conv public.conversations%ROWTYPE;
  recipient uuid;
  preview text;
  seller_email text;
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

  -- Email the seller whenever the buyer sends a message.
  IF NEW.sender_id = conv.buyer_id THEN
    SELECT email INTO seller_email FROM auth.users WHERE id = conv.seller_id;

    IF seller_email IS NOT NULL AND length(trim(seller_email)) > 0 THEN
      PERFORM public.invoke_user_notify(
        'new_message',
        jsonb_build_object(
          'to_email', seller_email,
          'conversation_id', conv.id,
          'listing_id', conv.listing_id,
          'message_id', NEW.id,
          'message_preview', preview,
          'message', format(
            'You have a new message on AhiaUlo.%s%s',
            E'\n\n',
            COALESCE(NULLIF(preview, ''), 'Open Chat to reply.')
          )
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
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();
