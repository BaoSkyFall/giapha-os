-- Auth hardening migration
-- Run this SQL on Supabase/Postgres before enabling phone-password auth cutover.

BEGIN;

-- Centralized distributed rate-limit buckets (shared across app instances).
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset_at
  ON public.auth_rate_limits(reset_at);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage auth_rate_limits" ON public.auth_rate_limits;
CREATE POLICY "Service role manage auth_rate_limits"
  ON public.auth_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Atomic distributed rate-limit counter.
CREATE OR REPLACE FUNCTION public.auth_consume_rate_limit(
  p_scope TEXT,
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INT,
  current_count INT,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate-limit config: limit=% window=%', p_limit, p_window_seconds;
  END IF;

  INSERT INTO public.auth_rate_limits AS rl (scope, key, count, reset_at, updated_at)
  VALUES (p_scope, p_key, 1, v_now + make_interval(secs => p_window_seconds), v_now)
  ON CONFLICT (scope, key)
  DO UPDATE SET
    count = CASE
      WHEN rl.reset_at <= v_now THEN 1
      ELSE rl.count + 1
    END,
    reset_at = CASE
      WHEN rl.reset_at <= v_now THEN v_now + make_interval(secs => p_window_seconds)
      ELSE rl.reset_at
    END,
    updated_at = v_now
  RETURNING rl.count, rl.reset_at INTO v_count, v_reset;

  allowed := v_count <= p_limit;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset - v_now)))::INT)
  END;
  current_count := v_count;
  reset_at := v_reset;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_consume_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_consume_rate_limit(TEXT, TEXT, INT, INT) TO service_role;

-- Atomic OTP attempt consumption to avoid race conditions under concurrency.
CREATE OR REPLACE FUNCTION public.auth_consume_otp_attempt(
  p_request_id UUID,
  p_max_attempts INT DEFAULT 5
)
RETURNS TABLE (
  allowed BOOLEAN,
  attempts INT,
  remaining_attempts INT,
  locked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INT;
  v_max INT;
BEGIN
  UPDATE public.phone_otp_requests r
  SET
    attempts = r.attempts + 1,
    invalidated_at = CASE
      WHEN r.attempts + 1 >= COALESCE(r.max_attempts, p_max_attempts) THEN COALESCE(r.invalidated_at, NOW())
      ELSE r.invalidated_at
    END,
    failure_reason = CASE
      WHEN r.attempts + 1 >= COALESCE(r.max_attempts, p_max_attempts) THEN 'attempt_limit_reached'
      ELSE r.failure_reason
    END
  WHERE r.id = p_request_id
    AND r.verified_at IS NULL
    AND r.invalidated_at IS NULL
    AND r.attempts < COALESCE(r.max_attempts, p_max_attempts)
  RETURNING r.attempts, COALESCE(r.max_attempts, p_max_attempts)
  INTO v_attempts, v_max;

  IF FOUND THEN
    allowed := true;
    attempts := v_attempts;
    remaining_attempts := GREATEST(0, v_max - v_attempts);
    locked := v_attempts >= v_max;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COALESCE(r.attempts, 0), COALESCE(r.max_attempts, p_max_attempts)
  INTO v_attempts, v_max
  FROM public.phone_otp_requests r
  WHERE r.id = p_request_id;

  IF NOT FOUND THEN
    allowed := false;
    attempts := 0;
    remaining_attempts := 0;
    locked := true;
    RETURN NEXT;
    RETURN;
  END IF;

  allowed := false;
  attempts := v_attempts;
  remaining_attempts := GREATEST(0, v_max - v_attempts);
  locked := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_consume_otp_attempt(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_consume_otp_attempt(UUID, INT) TO service_role;

COMMIT;

