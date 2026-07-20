-- Fix Auth signup HTTP 500 ("Database error saving new user") caused by failing
-- AFTER INSERT triggers on auth.users (profile row creation / admin notify).
--
-- Symptoms: POST /auth/v1/signup → 500 while the client shows a generic error.
-- Common causes addressed:
--   • handle_new_user raising when phone metadata is empty (legacy 0021 behavior)
--   • profiles.phone unique violations across 0810… vs +234… formats
--   • admin notify trigger surfacing errors instead of warning-only

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
  resolved_phone := public.normalize_listing_phone(
    coalesce(nullif(trim(new.phone), ''), metadata_phone)
  );

  IF resolved_phone IS NULL OR length(resolved_phone) < 10 THEN
    resolved_phone := 'pending:' || new.id::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> new.id
      AND public.normalize_listing_phone(p.phone) = public.normalize_listing_phone(resolved_phone)
      AND NOT public.is_pending_phone(p.phone)
  ) THEN
    RAISE EXCEPTION 'profile_phone_already_linked'
      USING ERRCODE = '23505';
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

CREATE OR REPLACE FUNCTION public.notify_admin_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'notify_admin_on_auth_user_created: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
