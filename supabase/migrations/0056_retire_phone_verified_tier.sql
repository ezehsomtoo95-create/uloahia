-- =============================================================================
-- 0056: retire phone_verified as an active/earnable verification tier
-- =============================================================================
-- Decision: the trust ladder is now
--     none -> id_verified -> shop_verified -> business_verified
-- phone_verified is RETIRED. The enum value is kept for the historical record
-- but nothing displays it and nothing can newly earn it.
--
-- WHY (this supersedes the original purpose of 0056)
-- ---------------------------------------------
-- 0055 backfilled tiers using the live RPC predicate:
--
--   (phone_verified_at IS NOT NULL OR public.profile_phone_is_complete(phone))
--
-- profile_phone_is_complete() is just `NOT is_pending_phone(value)` - true for
-- ANY well-formed number, and it never checks OTP confirmation. Measured on
-- production after 0055: 24 of 24 profiles came out phone_verified while only
-- 10 had phone_verified_at and only 4 had auth.users.phone_confirmed_at.
--
-- Narrowing that predicate would have left 10 sellers holding a "Phone
-- verified" badge. That still is not a trust signal worth displaying: a
-- confirmed phone number says the seller can receive a WhatsApp message, not
-- that they are who they say they are. Verification now starts at ID, which
-- is an actual identity check.
--
-- This file previously re-derived tiers so that 10 kept a phone badge. That
-- version was never applied and never pushed; it is replaced rather than
-- superseded, so the migration history carries one migration per decision.
--
-- WHAT IS DELIBERATELY NOT TOUCHED
-- -----------------------------------
-- phone_verified_at is left exactly as it is, and so is the whole phone
-- account flow. is_pending_profile_phone() gates /profile/complete in six
-- places and concerns HAVING a phone number, not confirming it. Retiring the
-- public trust tier must not strand a new signup who has not entered a
-- number yet.
--
-- Consequence, stated plainly: sellers who genuinely completed OTP lose a
-- visible badge and now look identical to sellers who did nothing. They
-- regain a signal only by completing ID verification.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Reset every profile to 'none', unconditionally
-- -----------------------------------------------------------------------------
-- Deliberately NOT keyed on phone_verified_at, and deliberately includes the
-- admin account. Keying it conditionally would leave 10 profiles holding a
-- badge for a signal the ladder no longer displays.
UPDATE public.profiles
SET verification_tier = 'none'
WHERE verification_tier <> 'none';

-- -----------------------------------------------------------------------------
-- 2) RPCs: no change required
-- -----------------------------------------------------------------------------
-- The three seller RPCs return verification_tier as an opaque enum value and
-- branch on nothing, so they simply return 'none' for every seller after the
-- update above. Their `phone_verified` boolean column is intentionally left
-- in the RETURNS TABLE signatures: nothing renders it, and removing it would
-- require DROP FUNCTION (CREATE OR REPLACE cannot change a return type) for
-- zero user-visible gain.
--
-- get_public_community_authors_by_ids (migration 0047) is likewise untouched.
--
-- What DOES change is the app: lib/types/engagement.ts drops phone_verified
-- from VERIFICATION_TIER_META and from ACHIEVABLE_VERIFICATION_TIERS, so no
-- code path can render it even if a stale row ever reappears.

-- -----------------------------------------------------------------------------
-- 3) Verification (read-only)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_total   bigint;
  v_non_none bigint;
BEGIN
  SELECT count(*) INTO v_total FROM public.profiles;
  -- Must be 0: after this migration nothing may hold a displayable tier until
  -- an admin approves an ID document.
  SELECT count(*) INTO v_non_none
    FROM public.profiles WHERE verification_tier <> 'none';
  RAISE NOTICE 'profiles: % total, % still holding a non-none tier', v_total, v_non_none;
  IF v_non_none <> 0 THEN
    RAISE EXCEPTION 'verification tiers not fully reset: % row(s) remain', v_non_none;
  END IF;
END;
$$;
