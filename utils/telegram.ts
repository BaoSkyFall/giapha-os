export type AdditionalDataRequestTelegramEvent =
  | "submitted"
  | "approved"
  | "rejected";

export interface AdditionalDataRequestTelegramPayload {
  event: AdditionalDataRequestTelegramEvent;
  requestId: string;
  personName: string;
  submitterName: string;
  changedFields: string[];
  relationshipDetails?: string[];
  adminLink: string;
  decisionNote?: string | null;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";

const getBaseUrl = () => {
  const explicit =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3002";
};

export const getAdditionalDataRequestAdminLink = (requestId?: string) => {
  const baseUrl = getBaseUrl();
  if (!requestId) return `${baseUrl}/dashboard/additional-data-requests`;
  return `${baseUrl}/dashboard/additional-data-requests?request=${encodeURIComponent(requestId)}`;
};

const getEventLabel = (event: AdditionalDataRequestTelegramEvent) => {
  if (event === "submitted") return "YÊU CẦU MỚI";
  if (event === "approved") return "YÊU CẦU ĐÃ PHÊ DUYỆT";
  return "YÊU CẦU ĐÃ TỪ CHỐI";
};

const buildTelegramText = (payload: AdditionalDataRequestTelegramPayload) => {
  const lines = [
    `[${getEventLabel(payload.event)}] Yêu cầu bổ sung dữ liệu`,
    `Mã yêu cầu: ${payload.requestId}`,
    `Thành viên: ${payload.personName}`,
    `Người gửi: ${payload.submitterName}`,
    `Các trường thay đổi: ${payload.changedFields.length > 0 ? payload.changedFields.join(", ") : "Không có"}`,
  ];

  if (payload.relationshipDetails && payload.relationshipDetails.length > 0) {
    lines.push(`Thông tin quan hệ gia phả: ${payload.relationshipDetails.join(" | ")}`);
  }

  if (payload.decisionNote && payload.decisionNote.trim().length > 0) {
    lines.push(`Ghi chú xử lý: ${payload.decisionNote.trim()}`);
  }

  lines.push(`Link quản trị: ${payload.adminLink}`);
  return lines.join("\n");
};

export const sendAdditionalDataRequestTelegram = async (
  payload: AdditionalDataRequestTelegramPayload,
) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      ok: false,
      skipped: true,
      error:
        "Telegram chưa được cấu hình. Hãy thiết lập TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID.",
    };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const text = buildTelegramText(payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      let friendly = `Gọi Telegram API thất bại: HTTP ${response.status} ${body}`;

      try {
        const parsed = JSON.parse(body) as {
          description?: string;
          error_code?: number;
        };
        const desc = (parsed.description || "").toLowerCase();
        if (desc.includes("chat not found")) {
          friendly =
            "Không tìm thấy chat Telegram. Hãy kiểm tra TELEGRAM_CHAT_ID và đảm bảo bot đã được thêm vào chat nhận.";
        } else if (desc.includes("bot was blocked by the user")) {
          friendly =
            "Bot Telegram đang bị chặn bởi người dùng/nhóm đích. Hãy bỏ chặn bot rồi thử lại.";
        }
      } catch {
        // Keep default friendly message above.
      }

      return {
        ok: false,
        skipped: false,
        error: friendly,
      };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : "Lỗi Telegram không xác định",
    };
  }
};
