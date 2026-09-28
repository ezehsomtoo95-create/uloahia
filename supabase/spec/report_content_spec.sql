-- =============================================================================
-- report_content fix: standalone specification/test script
--
-- THIS IS NOT A MIGRATION. It must never live in supabase/migrations/,
-- because `supabase db push` applies every .sql in that folder in
-- lexicographic order and this script is a scratch psql harness (it uses
-- psql meta-commands, mocks auth.uid(), seeds auth.users and ends in
-- ROLLBACK). Running it through the migration pipeline breaks the push.
-- =============================================================================
-- Proves (as pure SQL with no app code) that migration 0051 fixes the false
-- "This content is no longer available to report." bug for self-reported
-- content, while still raising content_not_found for genuinely-missing rows.
--
-- Run against a SCRATCH Postgres with the community/safety schema and roles
-- populated (uses `BEGIN ... EXCEPTION ... ROLLBACK` — NO data is committed):
--
--   psql $DATABASE_URL -v ON_ERROR_STOP=1 -f supabase/spec/report_content_spec.sql
--
-- (auth.uid() is mocked by `SET request.jwt.claim.sub` to the reporter id;
--  this mirrors how PostgREST/Supabase calls SECURITY DEFINER functions.)
-- =============================================================================
\set ON_ERROR_STOP on
\echo '--- report_content spec: starting ---'

BEGIN;

-- Mock the authenticated user (reporter). Mirrors Supabase PostgREST behavior.
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- Seed: one row per content type, owned by the REPORTER (the previously-broken case).
INSERT INTO auth.users (id, email, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'reporter@example.com', now()),
  ('00000000-0000-0000-0000-000000000002', 'other@example.com', now());

INSERT INTO community_posts (id, author_id, channel, body, status, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'biz', 'hi', 'published', now());
INSERT INTO community_replies (id, post_id, author_id, body, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'reply', now());
INSERT INTO listing_comments (id, listing_id, author_id, body, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'lc', now());
INSERT INTO conversations (id, seller_id, buyer_id, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', now());

-- Helper to capture ok/already_reported from the function.
CREATE OR REPLACE FUNCTION spec_report(t text, id uuid)
RETURNS TABLE(ok boolean, already_reported boolean, err text)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT r.ok, r.already_reported, NULL::text
  FROM public.report_content(t, id, 'spam', 'self-report spec') AS r;
EXCEPTION WHEN content_not_found THEN
  RETURN QUERY SELECT false, false, 'content_not_found'::text;
END;
$$;

-- 1) Self-report of OWN content must now SUCCEED (before 0050 it failed here).
SELECT 'community_post self-report' AS case, (spec_report('community_post','10000000-0000-0000-0000-000000000001')).*;
SELECT 'community_reply self-report' AS case, (spec_report('community_reply','20000000-0000-0000-0000-000000000001')).*;
SELECT 'listing_comment self-report' AS case, (spec_report('listing_comment','30000000-0000-0000-0000-000000000001')).*;
SELECT 'chat_conversation report (reporter=seller)' AS case, (spec_report('chat_conversation','40000000-0000-0000-0000-000000000001')).*;

-- 2) Duplicate report for the SAME (reporter, type, id) must yield already_reported=true.
SELECT 'duplicate report returns already_reported' AS case,
       (spec_report('community_post','10000000-0000-0000-0000-000000000001')).*;

-- 3) Genuinely-missing content MUST still raise content_not_found.
SELECT 'missing content still raises content_not_found' AS case,
       (spec_report('community_post','00000000-0000-0000-0000-000000000999')).*;

-- 4) Reports were actually inserted for the successful cases.
SELECT 'reports persisted count' AS case, (
  SELECT count(*) FROM content_reports cr
  WHERE cr.reporter_id = '00000000-0000-0000-0000-000000000001'
) AS value;

ROLLBACK;
\echo '--- report_content spec: completed (no data committed) ---'
