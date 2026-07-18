-- Track when a user completed password setup (NULL = legacy OTP-only account).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

COMMENT ON COLUMN public.profiles.password_set_at IS
  'Timestamp when the user set their login password. NULL for accounts that have not migrated from OTP-only login.';
