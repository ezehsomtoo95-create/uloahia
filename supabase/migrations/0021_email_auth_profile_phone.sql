-- Ensure email/password signups can still create required unique profile phones.
-- Existing data is preserved; we only update the auth trigger behavior.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata_phone text;
  resolved_phone text;
BEGIN
  metadata_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  resolved_phone := nullif(trim(coalesce(new.phone, metadata_phone, '')), '');

  IF resolved_phone IS NULL THEN
    RAISE EXCEPTION 'Phone number is required for profile creation.';
  END IF;

  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (
    new.id,
    resolved_phone,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET phone = excluded.phone,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  RETURN new;
END;
$$;
