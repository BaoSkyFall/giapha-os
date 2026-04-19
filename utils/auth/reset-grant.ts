import { createHash, randomBytes } from "crypto";

export const RESET_GRANT_TTL_MS = 10 * 60 * 1000;

const getResetGrantPepper = () =>
  process.env.OTP_PASSWORD_PEPPER ||
  process.env.OTP_CODE_SALT ||
  "fallback-reset-grant-pepper";

export const createResetGrant = () => randomBytes(24).toString("hex");

export const hashResetGrant = (resetGrant: string) =>
  createHash("sha256")
    .update(`${resetGrant}:${getResetGrantPepper()}`)
    .digest("hex");
