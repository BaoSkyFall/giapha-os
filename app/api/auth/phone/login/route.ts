import { buildOtpAliasEmail } from "@/utils/auth/otp";
import { isValidPhonePassword, PHONE_PASSWORD_LENGTH } from "@/utils/auth/password";
import { normalizeVietnamPhone } from "@/utils/auth/phone";
import { getRequestIp } from "@/utils/auth/request";
import { consumeRateLimit } from "@/utils/auth/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const getAnonClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Thiếu cấu hình xác thực Supabase công khai. Cần NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    const ip = getRequestIp(request);
    const payload = await request.json();
    const rawPhoneNumber = payload?.phoneNumber;
    const password = payload?.password;

    if (typeof rawPhoneNumber !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Thông tin đăng nhập không hợp lệ.", traceId },
        { status: 400 },
      );
    }

    if (!isValidPhonePassword(password)) {
      return NextResponse.json(
        {
          error: `Mật khẩu phải gồm đúng ${PHONE_PASSWORD_LENGTH} chữ số.`,
          traceId,
        },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const adminSupabase = createAdminClient();
    const limiter = await consumeRateLimit(
      adminSupabase,
      `phone_login:${phoneNumber}`,
      10,
      5 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      adminSupabase,
      `phone_login_ip:${ip}:${phoneNumber}`,
      20,
      5 * 60,
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        {
          error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.",
          retryAfterSeconds: limiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }
    if (!ipLimiter.allowed) {
      return NextResponse.json(
        {
          error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.",
          retryAfterSeconds: ipLimiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id,is_active,role,phone_number")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Không thể tải thông tin tài khoản.", traceId },
        { status: 500 },
      );
    }

    if (!profile?.id || !profile.is_active) {
      return NextResponse.json(
        { error: "Số điện thoại hoặc mật khẩu không đúng.", traceId },
        { status: 401 },
      );
    }

    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(profile.id);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Không thể tải thông tin đăng nhập.", traceId },
        { status: 500 },
      );
    }

    const loginEmail = userData.user.email || buildOtpAliasEmail(phoneNumber);
    const anonSupabase = getAnonClient();
    const { data: signInData, error: signInError } =
      await anonSupabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: "Số điện thoại hoặc mật khẩu không đúng.", traceId },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      session: {
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        expiresAt: signInData.session.expires_at,
      },
      profile: {
        id: profile.id,
        role: profile.role,
      },
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xử lý yêu cầu đăng nhập.",
        traceId,
      },
      { status: 500 },
    );
  }
}
