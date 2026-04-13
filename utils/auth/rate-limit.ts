import { SupabaseClient } from "@supabase/supabase-js";

type RateLimitRow = {
  allowed: boolean;
  retry_after_seconds: number | null;
  current_count?: number | null;
};

type OtpAttemptRow = {
  allowed: boolean;
  attempts: number;
  remaining_attempts: number;
  locked: boolean;
};

const takeFirstRow = <T>(data: T | T[] | null) => {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
};

export const consumeRateLimit = async (
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
  scope = "auth",
) => {
  const { data, error } = await supabase.rpc("auth_consume_rate_limit", {
    p_scope: scope,
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(
      `Rate limit RPC failed. Run docs/auth-hardening-migration.sql first. [${error.message}]`,
    );
  }

  const row = takeFirstRow<RateLimitRow>(data);
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("Rate limit RPC returned invalid payload.");
  }

  return {
    allowed: row.allowed,
    retryAfterSeconds: Number(row.retry_after_seconds || 0),
  };
};

export const consumeOtpAttempt = async (
  supabase: SupabaseClient,
  requestId: string,
  maxAttempts: number,
) => {
  const { data, error } = await supabase.rpc("auth_consume_otp_attempt", {
    p_request_id: requestId,
    p_max_attempts: maxAttempts,
  });

  if (error) {
    throw new Error(
      `OTP attempt RPC failed. Run docs/auth-hardening-migration.sql first. [${error.message}]`,
    );
  }

  const row = takeFirstRow<OtpAttemptRow>(data);
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("OTP attempt RPC returned invalid payload.");
  }

  return {
    allowed: row.allowed,
    attempts: Number(row.attempts || 0),
    remainingAttempts: Number(row.remaining_attempts || 0),
    locked: Boolean(row.locked),
  };
};

