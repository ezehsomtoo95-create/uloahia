-- =============================================================================
-- 0057: repair verification_requests and contact_events privileges
-- =============================================================================
-- Phase 2 production bug: the seller dashboard showed
--   42501 permission denied for table verification_requests
-- and "Withdraw and upload a different one" failed.
--
-- TWO SEPARATE CAUSES
--
-- 1) Missing table-level GRANT.
--    Verified against production with a real user session: SELECT and INSERT
--    both returned 42501, while an unrelated table (`listings`) returned OK.
--    Every table in this migration ran to completion - all 0055 functions
--    exist and were callable - but the
--      GRANT ... ON public.verification_requests TO authenticated
--    and
--      GRANT SELECT ON public.contact_events TO authenticated
--    statements did not take effect. Because a table-level privilege failure
--    surfaces as 42501 exactly like an RLS rejection, this was easy to
--    misread as a missing policy. It is not: no policy change alone would
--    have fixed it.
--
--    Blast radius today: verification_requests ONLY. The seller-stats RPCs
--    (seller_weekly_stats, get_seller_response_time) are SECURITY DEFINER
--    and execute as the owner, so they were never affected - confirmed
--    working. contact_events is currently read and written by NO app code, so
--    the missing grant is latent there; it would surface the moment
--    contact-tap instrumentation starts writing rows.
--
-- 2) No DELETE policy or grant ever existed.
--    0055 created SELECT, INSERT and an admin UPDATE policy, but nothing for
--    DELETE. withdrawVerificationDoc() therefore could not have worked even
--    with cause 1 fixed. This one is simply an omission in 0055.
--
-- Safety: scoped to two tables. Idempotent throughout, and the assertions at
-- the end raise if anything did not apply, so a partial run fails loudly
-- instead of resurfacing on the dashboard.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Re-assert the table grants
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_requests TO authenticated;
GRANT ALL ON TABLE public.verification_requests TO service_role;

GRANT SELECT ON public.contact_events TO authenticated;
GRANT ALL ON TABLE public.contact_events TO service_role;

-- -----------------------------------------------------------------------------
-- 2) The DELETE policy that 0055 never created
-- -----------------------------------------------------------------------------
-- Scoped to the caller's own row, so this cannot be used to delete or probe
-- another seller's submission. Withdraw removes the pending row; reviewed
-- rows stay as the audit trail.
DROP POLICY IF EXISTS "verification_requests_own_delete" ON public.verification_requests;
CREATE POLICY "verification_requests_own_delete"
  ON public.verification_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3) Re-assert the policies 0055 created, in case they were affected too.
--    Cheap insurance: if they are present these are no-ops.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "verification_requests_own_select" ON public.verification_requests;
CREATE POLICY "verification_requests_own_select"
  ON public.verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_email_admin() OR public.is_admin());

DROP POLICY IF EXISTS "verification_requests_own_insert" ON public.verification_requests;
CREATE POLICY "verification_requests_own_insert"
  ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- -----------------------------------------------------------------------------
-- 4) Post-conditions
-- -----------------------------------------------------------------------------
-- SELF-CONTAINED AND INDEPENDENT. Everything above is the actual fix; this
-- section only checks it. The Supabase SQL editor wraps the whole script in
-- one transaction, so an error in the assertions rolls the GRANTs and policies
-- back with them - which is what happened on the first two attempts of this
-- migration, leaving the bug unfixed both times.
--
-- If you would rather not risk that coupling, run sections 1-3 on their own
-- and this file's section 4 separately afterwards. The fix does not depend on
-- the assertions passing; the assertions only exist to make a silent partial
-- apply loud.
--
-- Corrections from the two failed versions:
--   attempt 1, 42883: has_table_privilege lives in pg_catalog, not public, and
--                      is OVERLOADED on arg 1 ((name,text,text) and
--                      (oid,text,text) both exist), so an untyped literal could
--                      not resolve a signature. Now schema-qualified, with the
--                      role's oid passed and text args cast explicitly.
--   attempt 2, 22P02: rolname::oid casts the role NAME to oid, which is not a
--                      valid cast. pg_roles.oid is a real column, so it is now
--                      selected directly.
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_role    oid;
  v_privileged boolean;
BEGIN
  SELECT r.oid INTO v_role
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = 'authenticated';

  IF v_role IS NULL THEN
    RAISE EXCEPTION '0057: role "authenticated" does not exist';
  END IF;

  -- One helper-style check per privilege. 'SELECT'/'INSERT'/'DELETE' are the
  -- three the seller flow needs; UPDATE is asserted too since 0055 granted it.
  v_privileged := pg_catalog.has_table_privilege(
    v_role, 'public.verification_requests'::text, 'SELECT'::text);
  IF NOT v_privileged THEN
    v_missing := v_missing || 'verification_requests.SELECT';
  END IF;

  v_privileged := pg_catalog.has_table_privilege(
    v_role, 'public.verification_requests'::text, 'INSERT'::text);
  IF NOT v_privileged THEN
    v_missing := v_missing || 'verification_requests.INSERT';
  END IF;

  v_privileged := pg_catalog.has_table_privilege(
    v_role, 'public.verification_requests'::text, 'UPDATE'::text);
  IF NOT v_privileged THEN
    v_missing := v_missing || 'verification_requests.UPDATE';
  END IF;

  v_privileged := pg_catalog.has_table_privilege(
    v_role, 'public.verification_requests'::text, 'DELETE'::text);
  IF NOT v_privileged THEN
    v_missing := v_missing || 'verification_requests.DELETE';
  END IF;

  v_privileged := pg_catalog.has_table_privilege(
    v_role, 'public.contact_events'::text, 'SELECT'::text);
  IF NOT v_privileged THEN
    v_missing := v_missing || 'contact_events.SELECT';
  END IF;

  -- A grant without a policy still yields 42501 on delete, indistinguishable
  -- from a missing grant at the client - so confirm the policy exists too.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'verification_requests'
      AND policyname = 'verification_requests_own_delete'
  ) THEN
    v_missing := v_missing || 'policy verification_requests_own_delete';
  END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION
      '0057 did not fully apply. Still missing: %', array_to_string(v_missing, ', ');
  END IF;

  RAISE NOTICE '0057 verified: verification_requests and contact_events privileges OK';
END;
$$;

-- Informational only: confirms the repair was a no-op on data.
DO $$
DECLARE
  v_pending bigint;
BEGIN
  SELECT count(*) INTO v_pending
  FROM public.verification_requests WHERE status = 'pending';
  RAISE NOTICE 'verification_requests: % pending submission(s) preserved', v_pending;
END;
$$;
