-- Grant service_role direct table access (required even when RLS is bypassed).

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.app_config TO service_role;
GRANT ALL ON TABLE public.listings TO service_role;
GRANT ALL ON TABLE public.listing_images TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.reports TO service_role;
GRANT ALL ON TABLE public.saved_listings TO service_role;
GRANT ALL ON TABLE public.listing_views TO service_role;
