-- ============================================================
-- PHONE OTP MIGRATION GUIDE (for existing email users)
-- ============================================================
-- Run this after applying docs/schema.sql changes.
-- Purpose: map existing user IDs to phone numbers so OTP login can
-- reuse the same account (no duplicate user/profile).

-- 0) Ensure provider request id column exists for OTP Gateway verify flow
ALTER TABLE public.phone_otp_requests
ADD COLUMN IF NOT EXISTS provider_request_id TEXT;

-- 0.1) Ensure member onboarding profile columns exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS birth_year INT,
ADD COLUMN IF NOT EXISTS birth_month INT,
ADD COLUMN IF NOT EXISTS birth_day INT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS generation INT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- 1) Optional: inspect users without phone mapping
SELECT
  p.id AS user_id,
  au.email,
  p.role,
  p.phone_number
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.phone_number IS NULL
ORDER BY au.created_at DESC;

-- 2) Manually map phone numbers (examples)
-- IMPORTANT: phone_number must be E.164 format for Vietnam (+84...)
-- Example:
-- UPDATE public.profiles
-- SET phone_number = '+84901234567',
--     phone_auth_expires_at = NOW() + INTERVAL '30 days'
-- WHERE id = '00000000-0000-0000-0000-000000000000';

-- 3) Validate duplicate phone mappings before enforcing OTP-only access
SELECT phone_number, COUNT(*) AS total
FROM public.profiles
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1;

-- 4) Validate final mapping result
SELECT
  p.id AS user_id,
  au.email,
  p.role,
  p.phone_number,
  p.phone_auth_expires_at
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY au.created_at DESC;
