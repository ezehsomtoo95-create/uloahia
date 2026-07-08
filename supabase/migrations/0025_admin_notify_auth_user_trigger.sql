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
  auth_header_value text;
BEGIN
  RAISE LOG 'admin-notify: invoked. type=%, details=%', notify_type, LEFT(COALESCE(notify_details::text, ''), 500);

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

  RAISE LOG 'admin-notify: config loaded. notify_url_present=%, notify_secret_length=%',
    (notify_url IS NOT NULL AND length(trim(notify_url)) > 0),
    COALESCE(length(notify_secret), 0);

  IF notify_url IS NULL OR notify_secret IS NULL OR length(trim(notify_url)) = 0 OR length(trim(notify_secret)) = 0 THEN
    RAISE LOG 'admin-notify: missing config; skipping invoke.';
    RAISE WARNING 'admin-notify skipped: configure app_config admin_notify_function_url and admin_notify_secret';
    RETURN;
  END IF;

  -- Log URL + headers being used (mask the bearer token to avoid full secret in logs).
  auth_header_value := 'Bearer ' ||
    CASE
      WHEN length(notify_secret) <= 8 THEN '***'
      ELSE substr(notify_secret, 1, 4) || '***' || substr(notify_secret, length(notify_secret)-3, 4)
    END;

  RAISE LOG 'admin-notify: calling net.http_post url=%, headers=%', notify_url, auth_header_value;

  BEGIN
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
      -- Keep trigger from failing silently; include request_id if available.
      RAISE WARNING 'admin-notify: net.http_post failed. type=%, url=%, error=%', notify_type, notify_url, SQLERRM;
      RETURN;
  END;

  RAISE LOG 'admin-notify: net.http_post completed. request_id=%', request_id;
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
  RAISE LOG 'admin-notify trigger: auth.users AFTER INSERT fired. user_id=%, email=%', NEW.id, COALESCE(NEW.email, '');

  RAISE LOG 'admin-notify trigger: calling invoke_admin_notify for new_user...';
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

  RAISE LOG 'admin-notify trigger: invoke_admin_notify completed.';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_admin_notify ON auth.users;

CREATE TRIGGER on_auth_user_admin_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_auth_user_created();
