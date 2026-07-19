-- Backfill phone verification for existing complete phone numbers.
-- New changes clear phone_verified_at until OTP succeeds (see finalizePhoneChange).

UPDATE public.profiles
SET phone_verified_at = COALESCE(phone_verified_at, created_at, now())
WHERE phone IS NOT NULL
  AND length(trim(phone)) > 0
  AND NOT public.is_pending_phone(phone)
  AND phone_verified_at IS NULL;
