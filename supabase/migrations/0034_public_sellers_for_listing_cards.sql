-- Public seller card fields for listing grids (Home + Browse parity).
-- SECURITY DEFINER so anon can read limited seller display fields without opening profiles RLS.

CREATE OR REPLACE FUNCTION public.get_public_sellers_by_ids(seller_uuids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  phone_verified boolean
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
    (p.phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(p.phone)) AS phone_verified
  FROM public.profiles p
  WHERE p.id = ANY (seller_uuids)
    AND coalesce(p.account_status, 'active') = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_sellers_by_ids(uuid[]) TO anon, authenticated;
