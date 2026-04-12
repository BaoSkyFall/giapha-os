import { otpLog } from "@/utils/auth/log";
import { maskPhoneNumber, toVietnamDomesticPhone } from "@/utils/auth/phone";

type SendOtpSmsParams = {
  phoneNumber: string;
  traceId?: string;
};

type VerifyOtpWithProviderParams = {
  requestId: string;
  otp: string;
  traceId?: string;
};

type GatewayResult = {
  ok: boolean;
  httpStatus: number;
  message: string;
  raw: unknown;
  code: "ok" | "invalid_otp" | "request_not_found" | "provider_error";
};

const getApiKey = () => {
  const apiKey =
    process.env.OTP_GATEWAY_API_KEY || process.env.SPEEDSMS_ACCESS_TOKEN;
  if (!apiKey) {
    throw new Error("Missing OTP_GATEWAY_API_KEY.");
  }
  return apiKey;
};

const getRequestUrl = () =>
  process.env.OTP_GATEWAY_REQUEST_URL ||
  "https://otp-gateway.viethomes-jp.workers.dev/v1/partner/otp/request";

const getVerifyUrl = () =>
  process.env.OTP_GATEWAY_VERIFY_URL ||
  "https://otp-gateway.viethomes-jp.workers.dev/v1/partner/otp/verify";

const parseProviderMessage = (parsedBody: unknown, fallback: string) => {
  if (
    parsedBody &&
    typeof parsedBody === "object" &&
    "message" in parsedBody &&
    typeof (parsedBody as { message: unknown }).message === "string"
  ) {
    return (parsedBody as { message: string }).message;
  }

  return fallback;
};

const parseProviderRequestId = (parsedBody: unknown) => {
  if (!parsedBody || typeof parsedBody !== "object") return null;

  if (
    "request_id" in parsedBody &&
    typeof (parsedBody as { request_id: unknown }).request_id === "string"
  ) {
    return (parsedBody as { request_id: string }).request_id;
  }

  if (
    "requestId" in parsedBody &&
    typeof (parsedBody as { requestId: unknown }).requestId === "string"
  ) {
    return (parsedBody as { requestId: string }).requestId;
  }

  if (
    "data" in parsedBody &&
    (parsedBody as { data: unknown }).data &&
    typeof (parsedBody as { data: unknown }).data === "object"
  ) {
    const data = (parsedBody as { data: Record<string, unknown> }).data;
    if (typeof data.request_id === "string") return data.request_id;
    if (typeof data.requestId === "string") return data.requestId;
  }

  return null;
};

const parseProviderStatus = (parsedBody: unknown) => {
  if (
    parsedBody &&
    typeof parsedBody === "object" &&
    "status" in parsedBody &&
    typeof (parsedBody as { status: unknown }).status === "string"
  ) {
    return (parsedBody as { status: string }).status;
  }

  return null;
};

const parseSuccessFlag = (parsedBody: unknown) =>
  Boolean(
    parsedBody &&
      typeof parsedBody === "object" &&
      "success" in parsedBody &&
      (parsedBody as { success: unknown }).success === true,
  );

export const sendOtpSms = async ({ phoneNumber, traceId }: SendOtpSmsParams) => {
  const maskedPhone = maskPhoneNumber(phoneNumber);
  let apiKey = "";
  try {
    apiKey = getApiKey();
  } catch {
    otpLog("error", "otp_sms.config_missing", {
      traceId,
      maskedPhone,
      key: "OTP_GATEWAY_API_KEY",
    });
    throw new Error("Missing OTP_GATEWAY_API_KEY.");
  }

  const requestUrl = getRequestUrl();
  const domesticPhone = toVietnamDomesticPhone(phoneNumber);

  otpLog("info", "otp_provider.request_start", {
    traceId,
    maskedPhone,
    requestUrl,
  });

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      phone: domesticPhone,
    }),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = null;
  }

  const maybeStatus = parseProviderStatus(parsedBody);
  const isSuccessFlag = parseSuccessFlag(parsedBody);

  otpLog(
    response.ok && (isSuccessFlag || maybeStatus === "success")
      ? "info"
      : "error",
    "otp_provider.response",
    {
      traceId,
      maskedPhone,
      httpStatus: response.status,
      providerStatus: maybeStatus,
      responsePreview: rawBody.slice(0, 400),
    },
  );

  if (!response.ok || (!isSuccessFlag && maybeStatus !== "success")) {
    const providerMessage = parseProviderMessage(parsedBody, rawBody);

    if (response.status === 401) {
      throw new Error(`OTP Gateway unauthorized: ${providerMessage}`);
    }

    if (response.status === 402) {
      throw new Error(`OTP Gateway insufficient balance: ${providerMessage}`);
    }

    if (response.status === 404) {
      throw new Error(`OTP Gateway not found: ${providerMessage}`);
    }

    if (response.status === 429) {
      throw new Error(`OTP Gateway rate limited: ${providerMessage}`);
    }

    throw new Error(
      `OTP Gateway send failed: HTTP ${response.status}, body: ${rawBody}`,
    );
  }

  const requestId = parseProviderRequestId(parsedBody);
  if (!requestId) {
    throw new Error(
      `OTP Gateway response missing request_id: HTTP ${response.status}, body: ${rawBody}`,
    );
  }

  return {
    requestId,
    raw: parsedBody,
  };
};

export const verifyOtpWithProvider = async ({
  requestId,
  otp,
  traceId,
}: VerifyOtpWithProviderParams): Promise<GatewayResult> => {
  const apiKey = getApiKey();
  const verifyUrl = getVerifyUrl();

  otpLog("info", "otp_provider.verify_start", {
    traceId,
    requestId,
    verifyUrl,
  });

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      request_id: requestId,
      otp,
    }),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = null;
  }

  const maybeStatus = parseProviderStatus(parsedBody);
  const isSuccessFlag = parseSuccessFlag(parsedBody);
  const providerMessage = parseProviderMessage(parsedBody, rawBody);

  otpLog(
    response.ok && (isSuccessFlag || maybeStatus === "success")
      ? "info"
      : "warn",
    "otp_provider.verify_response",
    {
      traceId,
      requestId,
      httpStatus: response.status,
      providerStatus: maybeStatus,
      responsePreview: rawBody.slice(0, 400),
    },
  );

  if (response.ok && (isSuccessFlag || maybeStatus === "success")) {
    return {
      ok: true,
      httpStatus: response.status,
      message: providerMessage,
      raw: parsedBody,
      code: "ok",
    };
  }

  if (response.status === 400) {
    return {
      ok: false,
      httpStatus: response.status,
      message: providerMessage,
      raw: parsedBody,
      code: "invalid_otp",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      httpStatus: response.status,
      message: providerMessage,
      raw: parsedBody,
      code: "request_not_found",
    };
  }

  return {
    ok: false,
    httpStatus: response.status,
    message: providerMessage,
    raw: parsedBody,
    code: "provider_error",
  };
};
