const E164_VIETNAM_PREFIX = "+84";

export const normalizeVietnamPhone = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Vui lòng nhập số điện thoại.");
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  let nationalNumber = digitsOnly;

  if (hasLeadingPlus) {
    if (!trimmed.startsWith(E164_VIETNAM_PREFIX)) {
      throw new Error("Hiện tại chỉ hỗ trợ số điện thoại Việt Nam (+84).");
    }
    nationalNumber = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("84")) {
    nationalNumber = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("0")) {
    nationalNumber = digitsOnly.slice(1);
  }

  if (!/^\d{9,10}$/.test(nationalNumber)) {
    throw new Error("Số điện thoại không hợp lệ.");
  }

  return `${E164_VIETNAM_PREFIX}${nationalNumber}`;
};

export const maskPhoneNumber = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  const last3 = digits.slice(-3);
  return `+84 *** *** ${last3}`;
};

export const toVietnamDomesticPhone = (phoneNumber: string) => {
  const normalized = normalizeVietnamPhone(phoneNumber);
  const national = normalized.replace(/^\+84/, "");
  return `0${national}`;
};
