export const PHONE_PASSWORD_LENGTH = 6;
export const DEFAULT_MIGRATED_PASSWORD = "000000";

export const isValidPhonePassword = (value: string) =>
  new RegExp(`^\\d{${PHONE_PASSWORD_LENGTH}}$`).test(value);

