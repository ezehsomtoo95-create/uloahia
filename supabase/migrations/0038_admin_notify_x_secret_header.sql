-- Send admin-notify secret via x-admin-notify-secret (matches Edge Function auth).

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

  IF notify_url IS NULL OR notify_secret IS NULL OR length(trim(notify_url)) = 0 OR length(trim(notify_secret)) = 0 THEN
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
      RAISE WARNING 'admin-notify: net.http_post failed. type=%, url=%, error=%', notify_type, notify_url, SQLERRM;
      RETURN;
  END;

  RAISE LOG 'admin-notify: net.http_post completed. request_id=%', request_id;
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
