import { buildOtpAliasEmail } from "@/utils/auth/otp";
import { isValidPhonePassword, PHONE_PASSWORD_LENGTH } from "@/utils/auth/password";
import { normalizeVietnamPhone } from "@/utils/auth/phone";
import { hashResetGrant } from "@/utils/auth/reset-grant";
import { getRequestIp } from "@/utils/auth/request";
import { consumeRateLimit } from "@/utils/auth/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const isSchemaMissingError = (error: { code?: string; message?: string }) =>
  error.code === "42P01" ||
  error.code === "42703" ||
  error.code === "PGRST205" ||
  error.message?.includes("phone_otp_requests") ||
  error.message?.includes("reset_grant_hash") ||
  error.message?.includes("reset_grant_expires_at") ||
  error.message?.includes("reset_grant_used_at");

const getAnonClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase public auth configuration. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
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
    const resetGrant = payload?.resetGrant;
    const newPassword = payload?.newPassword;

    if (
      typeof rawPhoneNumber !== "string" ||
      typeof resetGrant !== "string" ||
      typeof newPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Thong tin dat lai mat khau khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (!isValidPhonePassword(newPassword)) {
      return NextResponse.json(
        {
          error: `Mat khau phai gom dung ${PHONE_PASSWORD_LENGTH} chu so.`,
          traceId,
        },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const adminSupabase = createAdminClient();
    const limiter = await consumeRateLimit(
      adminSupabase,
      `password_reset:phone:${phoneNumber}`,
      8,
      10 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      adminSupabase,
      `password_reset:ip_phone:${ip}:${phoneNumber}`,
      16,
      10 * 60,
    );

    if (!limiter.allowed || !ipLimiter.allowed) {
      const retryAfterSeconds =
        limiter.retryAfterSeconds || ipLimiter.retryAfterSeconds || 60;
      return NextResponse.json(
        {
          error: "Ban da thu dat lai mat khau qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id,is_active")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Khong the tai thong tin tai khoan.", traceId },
        { status: 500 },
      );
    }

    if (!profile?.id || !profile.is_active) {
      return NextResponse.json(
        { error: "Khong tim thay tai khoan dang hoat dong voi so dien thoai nay.", traceId },
        { status: 404 },
      );
    }

    const providedHash = hashResetGrant(resetGrant);
    const nowIso = new Date().toISOString();
    const { data: consumedGrant, error: consumeGrantError } = await adminSupabase
      .from("phone_otp_requests")
      .update({
        reset_grant_used_at: nowIso,
        invalidated_at: nowIso,
      })
      .eq("phone_number", phoneNumber)
      .eq("reset_grant_hash", providedHash)
      .not("verified_at", "is", null)
      .is("invalidated_at", null)
      .is("reset_grant_used_at", null)
      .gt("reset_grant_expires_at", nowIso)
      .select("id")
      .maybeSingle();

    if (consumeGrantError) {
      if (isSchemaMissingError(consumeGrantError)) {
        return NextResponse.json(
          {
            error:
              "Thieu cot reset grant trong bang OTP. Vui long cap nhat schema SQL.",
            traceId,
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "Khong the xac thuc reset grant.", traceId },
        { status: 500 },
      );
    }

    if (!consumedGrant?.id) {
      return NextResponse.json(
        { error: "Reset grant khong hop le hoac da het han.", traceId },
        { status: 401 },
      );
    }

    const { data: userData, error: getUserError } =
      await adminSupabase.auth.admin.getUserById(profile.id);

    if (getUserError || !userData.user) {
      return NextResponse.json(
        { error: "Khong the tai thong tin tai khoan.", traceId },
        { status: 500 },
      );
    }

    const loginEmail = userData.user.email || buildOtpAliasEmail(phoneNumber);
    const metadata = {
      ...(userData.user.user_metadata || {}),
      phone_number: phoneNumber,
      auth_method: "phone_password",
    };

    const { error: updateUserError } =
      await adminSupabase.auth.admin.updateUserById(profile.id, {
        password: newPassword,
        email: loginEmail,
        email_confirm: true,
        user_metadata: metadata,
      });

    if (updateUserError) {
      return NextResponse.json(
        {
          error: updateUserError.message || "Khong the cap nhat mat khau.",
          traceId,
        },
        { status: 500 },
      );
    }

    const anonSupabase = getAnonClient();
    const { data: signInData, error: signInError } =
      await anonSupabase.auth.signInWithPassword({
        email: loginEmail,
        password: newPassword,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        {
          error:
            signInError?.message ||
            "Dat lai mat khau thanh cong nhung khong tao duoc phien dang nhap.",
          traceId,
        },
        { status: 500 },
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
        phoneNumber,
      },
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau dat lai mat khau.",
        traceId,
      },
      { status: 500 },
    );
  }
}
