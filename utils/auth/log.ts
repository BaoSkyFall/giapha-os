type OtpLogLevel = "info" | "warn" | "error";

const isVerboseEnabled = () => {
  const value = process.env.OTP_DEBUG_LOG;
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const canLog = (level: OtpLogLevel) => {
  if (level === "error" || level === "warn") return true;
  return isVerboseEnabled();
};

export const otpLog = (
  level: OtpLogLevel,
  event: string,
  meta: Record<string, unknown> = {},
) => {
  if (!canLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    event,
    ...meta,
  };

  const line = `[otp-auth] ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
};
