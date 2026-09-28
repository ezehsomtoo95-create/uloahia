-- Grant service_role direct access to the Boost tables (required even when RLS
-- is bypassed), matching the repo convention established in migrations 0020,
-- 0030, 0031 and 0042.
--
-- Migration 0045 created boost_packages / boost_payments / boosts and only
-- granted SELECT to anon/authenticated, so the server-side client
-- (supabaseAdmin via service_role) failed with "permission denied for table
-- boost_packages" (SQLSTATE 42501) when resolving a package by id. These grants
-- fix that without any application code change.

GRANT ALL ON TABLE public.boost_packages TO service_role;
GRANT ALL ON TABLE public.boost_payments  TO service_role;
GRANT ALL ON TABLE public.boosts           TO service_role;

-- The activation RPC (SECURITY DEFINER) and the helper RPC are invoked through
-- supabaseAdmin() (service_role) and need explicit EXECUTE.
GRANT EXECUTE ON FUNCTION public.activate_boost(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION public.active_boost_expires_at(uuid) TO service_role;