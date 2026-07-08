-- Admin email notifications via the admin-notify Edge Function.
--
-- After deploying the function, set these app_config values in the SQL editor:
--
--   INSERT INTO public.app_config (key, value) VALUES
--     ('admin_notify_function_url', 'https://<project-ref>.supabase.co/functions/v1/admin-notify'),
--     ('admin_notify_secret', '<same value as Edge secret ADMIN_NOTIFY_SECRET>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- Listings: also create a Database Webhook (Dashboard → Database → Webhooks)
--   Table: public.listings | Event: INSERT | URL: admin_notify_function_url
--   HTTP header: Authorization: Bearer <admin_notify_secret>

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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
  SELECT value
  INTO notify_url
  FROM public.app_config
  WHERE key = 'admin_notify_function_url'
  LIMIT 1;

  SELECT value
  INTO notify_secret
  FROM public.app_config
  WHERE key = 'admin_notify_secret'
  LIMIT 1;

  IF notify_url IS NULL OR notify_secret IS NULL OR length(trim(notify_url)) = 0 OR length(trim(notify_secret)) = 0 THEN
    RAISE WARNING 'admin-notify skipped: configure app_config admin_notify_function_url and admin_notify_secret';
    RETURN;
  END IF;

  SELECT net.http_post(
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
  )
  INTO request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'admin-notify invoke failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  PERFORM public.invoke_admin_notify(
    'new_user',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'created_at', NEW.created_at,
      'email_confirmed_at', NEW.email_confirmed_at
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
