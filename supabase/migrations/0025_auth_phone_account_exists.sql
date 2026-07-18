-- Pre-auth phone lookup for signup / forgot-password flows (server-side only).
CREATE OR REPLACE FUNCTION public.auth_phone_account_exists(input_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE public.normalize_listing_phone(p.phone) = public.normalize_listing_phone(input_phone)
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE public.normalize_listing_phone(u.phone) = public.normalize_listing_phone(input_phone)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_phone_account_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_phone_account_exists(text) TO service_role;
