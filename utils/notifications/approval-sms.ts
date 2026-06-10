import { maskPhoneNumber, normalizeVietnamPhone } from "@/utils/auth/phone";

export interface NotificationSendResult {
  ok: boolean;
  skipped: boolean;
  error?: string;
}

interface SendApprovalSmsParams {
  phoneNumber: string;
  message: string;
  traceId?: string;
}

const getSmsConfig = () => {
  const endpoint = process.env.APPROVAL_SMS_ENDPOINT;
  const apiKey = process.env.APPROVAL_SMS_API_KEY;

  if (!endpoint || !apiKey) {
    return {
      configured: false as const,
      error:
        "SMS phê duyệt chưa được cấu hình. Hãy thiết lập APPROVAL_SMS_ENDPOINT và APPROVAL_SMS_API_KEY.",
    };
  }

  return {
    configured: true as const,
    endpoint,
    apiKey,
    authHeader: process.env.APPROVAL_SMS_AUTH_HEADER || "X-API-Key",
    phoneField: process.env.APPROVAL_SMS_PHONE_FIELD || "phone",
    messageField: process.env.APPROVAL_SMS_MESSAGE_FIELD || "message",
    phoneFormat:
      process.env.APPROVAL_SMS_PHONE_FORMAT === "domestic"
        ? ("domestic" as const)
        : ("e164" as const),
  };
};

const redactPhone = (value: string, phoneNumber: string) => {
  const normalized = normalizeVietnamPhone(phoneNumber);
  const domestic = normalized.replace(/^\+84/, "0");
  return value
    .replaceAll(normalized, maskPhoneNumber(normalized))
    .replaceAll(domestic, maskPhoneNumber(normalized));
};

export const sendApprovalSms = async ({
  phoneNumber,
  message,
  traceId,
}: SendApprovalSmsParams): Promise<NotificationSendResult> => {
  const config = getSmsConfig();
  if (!config.configured) {
    return {
      ok: false,
      skipped: true,
      error: config.error,
    };
  }

  try {
    const normalizedPhone = normalizeVietnamPhone(phoneNumber);
    const recipientPhone =
      config.phoneFormat === "domestic"
        ? normalizedPhone.replace(/^\+84/, "0")
        : normalizedPhone;
    const maskedPhone = maskPhoneNumber(normalizedPhone);

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [config.authHeader]: config.apiKey,
      },
      body: JSON.stringify({
        [config.phoneField]: recipientPhone,
        [config.messageField]: message,
        traceId,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = redactPhone(await response.text(), normalizedPhone);
      console.error("[approval_sms.failed]", {
        traceId,
        maskedPhone,
        httpStatus: response.status,
        responsePreview: body.slice(0, 400),
      });

      return {
        ok: false,
        skipped: false,
        error: `Gửi SMS phê duyệt thất bại: HTTP ${response.status}.`,
      };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    const maskedPhone = maskPhoneNumber(phoneNumber);
    console.error("[approval_sms.error]", {
      traceId,
      maskedPhone,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      skipped: false,
      error:
        error instanceof Error
          ? `Gửi SMS phê duyệt thất bại: ${error.message}`
          : "Gửi SMS phê duyệt thất bại.",
    };
  }
};
