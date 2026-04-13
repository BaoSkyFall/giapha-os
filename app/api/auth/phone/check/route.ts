import { normalizeVietnamPhone } from "@/utils/auth/phone";
import { getRequestIp } from "@/utils/auth/request";
import { consumeRateLimit } from "@/utils/auth/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    const payload = await request.json();
    const rawPhoneNumber = payload?.phoneNumber;

    if (typeof rawPhoneNumber !== "string") {
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ.", traceId },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const supabase = createAdminClient();
    const ip = getRequestIp(request);

    const limiter = await consumeRateLimit(
      supabase,
      `phone_check:${phoneNumber}`,
      40,
      10 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      supabase,
      `phone_check_ip:${ip}:${phoneNumber}`,
      80,
      10 * 60,
    );

    if (!limiter.allowed || !ipLimiter.allowed) {
      const retryAfterSeconds =
        limiter.retryAfterSeconds || ipLimiter.retryAfterSeconds || 60;
      return NextResponse.json(
        {
          error: "Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau.",
          retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,is_active")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Không thể kiểm tra số điện thoại.", traceId },
        { status: 500 },
      );
    }

    const exists = !!profile?.id;
    const canLogin = exists && !!profile?.is_active;

    return NextResponse.json({
      ok: true,
      exists,
      canLogin,
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể kiểm tra số điện thoại.",
        traceId,
      },
      { status: 500 },
    );
  }
}
