-- Add reset-grant columns used by forgot-password OTP-first flow.
-- Safe to run multiple times.

ALTER TABLE public.phone_otp_requests
  ADD COLUMN IF NOT EXISTS reset_grant_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_grant_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_grant_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_phone_otp_requests_reset_grant_active
  ON public.phone_otp_requests (phone_number, verified_at DESC)
  WHERE reset_grant_used_at IS NULL;
