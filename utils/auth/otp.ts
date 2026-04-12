import crypto from "crypto";

const OTP_CODE_SALT_FALLBACK = "giapha-otp-salt";
const OTP_PASSWORD_PEPPER_FALLBACK = "giapha-otp-password-pepper";

export const OTP_LENGTH = 6;
export const OTP_EXPIRES_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_SEND_LIMIT_HOUR = 5;
export const OTP_SEND_LIMIT_DAY = 10;
export const OTP_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const generateOtpCode = (length = OTP_LENGTH) => {
  const max = 10 ** length;
  return crypto.randomInt(0, max).toString().padStart(length, "0");
};

const getOtpCodeSalt = () =>
  process.env.OTP_CODE_SALT ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  OTP_CODE_SALT_FALLBACK;

export const hashOtpCode = (phoneNumber: string, code: string) => {
  return crypto
    .createHash("sha256")
    .update(`${phoneNumber}:${code}:${getOtpCodeSalt()}`)
    .digest("hex");
};

export const verifyOtpCode = (
  phoneNumber: string,
  code: string,
  expectedHash: string,
) => {
  const actualHash = hashOtpCode(phoneNumber, code);
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const getOtpPasswordPepper = () =>
  process.env.OTP_PASSWORD_PEPPER ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  OTP_PASSWORD_PEPPER_FALLBACK;

export const deriveOtpPassword = (phoneNumber: string) => {
  const digest = crypto
    .createHmac("sha256", getOtpPasswordPepper())
    .update(phoneNumber)
    .digest("hex");

  return `Otp!${digest.slice(0, 28)}aA1`;
};

export const buildOtpAliasEmail = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  return `member-${digits}@otp.giapha.local`;
};
