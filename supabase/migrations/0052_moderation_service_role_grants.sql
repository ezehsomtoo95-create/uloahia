-- =============================================================================
-- 0052: Grant service_role direct access to the moderation tables
-- =============================================================================
-- Phase 1 landmine. Migration 0049 created the moderation tables but only
-- granted:
--
--   GRANT SELECT, INSERT ON public.content_reports TO authenticated;
--
-- and nothing at all to service_role. Any server-side code that reads the
-- moderation queue through supabaseAdmin() therefore failed with:
--
--   42501 permission denied for table content_reports
--
-- (verified against production before this migration was written). The
-- submitContentReport() RPC still worked, because report_content is
-- SECURITY DEFINER and runs as its owner - so reports were being collected
-- into a table the app could not read. The queue was silently dead.
--
-- This mirrors the repo convention already established by 0046
-- (service_role grants for the boost tables) and by migrations 0020/0030/
-- 0031/0042. service_role bypasses RLS, so these grants are about table-level
-- privileges, not row security.
--
-- Idempotent: GRANT is a no-op when the privilege already exists.
-- =============================================================================

GRANT ALL ON TABLE public.content_reports        TO service_role;
GRANT ALL ON TABLE public.moderation_events      TO service_role;
GRANT ALL ON TABLE public.user_moderation_state  TO service_role;
GRANT ALL ON TABLE public.action_rate_limits     TO service_role;

-- moderation_events uses a serial PK; 0049 granted the sequence to
-- service_role already, but re-asserted here so this migration is
-- self-sufficient.
GRANT USAGE, SELECT ON SEQUENCE public.moderation_events_id_seq TO service_role;
