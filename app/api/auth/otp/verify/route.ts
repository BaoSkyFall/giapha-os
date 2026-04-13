import { buildOtpAliasEmail, OTP_MAX_ATTEMPTS, OTP_LENGTH } from "@/utils/auth/otp";
import { isValidPhonePassword, PHONE_PASSWORD_LENGTH } from "@/utils/auth/password";
import { otpLog } from "@/utils/auth/log";
import { maskPhoneNumber, normalizeVietnamPhone } from "@/utils/auth/phone";
import { getRequestIp } from "@/utils/auth/request";
import { consumeOtpAttempt, consumeRateLimit } from "@/utils/auth/rate-limit";
import { verifyOtpWithProvider } from "@/utils/auth/sms";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type OtpPurpose = "register" | "forgot_password";

const isSchemaMissingError = (error: { code?: string; message?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message?.includes("phone_otp_requests") ||
  error.message?.includes("phone_number") ||
  error.message?.includes("provider_request_id");

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

const signInWithEmailPassword = async (email: string, password: string) => {
  const anonSupabase = getAnonClient();
  return anonSupabase.auth.signInWithPassword({
    email,
    password,
  });
};

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    const ip = getRequestIp(request);
    otpLog("info", "otp_verify.request_start", { traceId });
    const payload = await request.json();
    const rawPhoneNumber = payload?.phoneNumber;
    const code = payload?.code;
    const purpose = payload?.purpose as OtpPurpose | undefined;
    const password = payload?.password;

    if (
      typeof rawPhoneNumber !== "string" ||
      typeof code !== "string" ||
      typeof password !== "string" ||
      (purpose !== "register" && purpose !== "forgot_password")
    ) {
      otpLog("warn", "otp_verify.invalid_payload", { traceId });
      return NextResponse.json(
        { error: "Thong tin xac thuc khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      otpLog("warn", "otp_verify.invalid_code_format", { traceId });
      return NextResponse.json(
        { error: `Ma OTP phai gom dung ${OTP_LENGTH} chu so.`, traceId },
        { status: 400 },
      );
    }

    if (!isValidPhonePassword(password)) {
      otpLog("warn", "otp_verify.invalid_password_format", { traceId });
      return NextResponse.json(
        {
          error: `Mat khau phai gom dung ${PHONE_PASSWORD_LENGTH} chu so.`,
          traceId,
        },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const maskedPhone = maskPhoneNumber(phoneNumber);
    const adminSupabase = createAdminClient();
    const limiter = await consumeRateLimit(
      adminSupabase,
      `otp_verify:phone:${phoneNumber}`,
      15,
      10 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      adminSupabase,
      `otp_verify:ip_phone:${ip}:${phoneNumber}`,
      30,
      10 * 60,
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        {
          error: "Ban da thu xac minh OTP qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds: limiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }
    if (!ipLimiter.allowed) {
      return NextResponse.json(
        {
          error: "Ban da thu xac minh OTP qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds: ipLimiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    otpLog("info", "otp_verify.phone_normalized", {
      traceId,
      maskedPhone,
      purpose,
    });

    const { data: challenge, error: challengeError } = await adminSupabase
      .from("phone_otp_requests")
      .select(
        "id,phone_number,provider_request_id,expires_at,attempts,max_attempts,verified_at,invalidated_at",
      )
      .eq("phone_number", phoneNumber)
      .is("verified_at", null)
      .is("invalidated_at", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError) {
      otpLog("error", "otp_verify.challenge_query_failed", {
        traceId,
        maskedPhone,
        challengeError,
      });

      if (isSchemaMissingError(challengeError)) {
        return NextResponse.json(
          {
            error: "Thieu bang OTP. Vui long cap nhat schema SQL truoc khi dung OTP.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the kiem tra trang thai OTP.", traceId },
        { status: 500 },
      );
    }

    if (!challenge) {
      otpLog("warn", "otp_verify.no_active_challenge", {
        traceId,
        maskedPhone,
      });
      return NextResponse.json(
        {
          error: "Khong tim thay yeu cau OTP hop le. Vui long gui lai ma.",
          traceId,
        },
        { status: 400 },
      );
    }

    const nowMs = Date.now();

    if (new Date(challenge.expires_at).getTime() < nowMs) {
      await adminSupabase
        .from("phone_otp_requests")
        .update({
          invalidated_at: new Date().toISOString(),
          failure_reason: "expired",
        })
        .eq("id", challenge.id);

      otpLog("warn", "otp_verify.challenge_expired", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
      });

      return NextResponse.json(
        { error: "Ma OTP da het han. Vui long gui lai ma moi.", traceId },
        { status: 400 },
      );
    }

    const maxAttempts = challenge.max_attempts || OTP_MAX_ATTEMPTS;

    if ((challenge.attempts || 0) >= maxAttempts) {
      await adminSupabase
        .from("phone_otp_requests")
        .update({
          invalidated_at: new Date().toISOString(),
          failure_reason: "attempt_limit_reached",
        })
        .eq("id", challenge.id);

      otpLog("warn", "otp_verify.challenge_locked", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
        attempts: challenge.attempts,
        maxAttempts,
      });

      return NextResponse.json(
        {
          error: "Ban da nhap sai OTP qua so lan cho phep. Vui long gui lai ma.",
          traceId,
        },
        { status: 429 },
      );
    }

    if (
      !challenge.provider_request_id ||
      typeof challenge.provider_request_id !== "string"
    ) {
      otpLog("error", "otp_verify.missing_provider_request_id", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
      });

      return NextResponse.json(
        {
          error:
            "Yeu cau OTP hien tai khong co request_id cua nha cung cap. Vui long gui lai OTP.",
          traceId,
        },
        { status: 500 },
      );
    }

    let providerVerify: Awaited<ReturnType<typeof verifyOtpWithProvider>>;
    try {
      providerVerify = await verifyOtpWithProvider({
        requestId: challenge.provider_request_id,
        otp: code,
        traceId,
      });
    } catch (providerError) {
      otpLog("error", "otp_verify.provider_verify_failed", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
        providerRequestId: challenge.provider_request_id,
        providerError:
          providerError instanceof Error
            ? providerError.message
            : String(providerError),
      });

      return NextResponse.json(
        {
          error: "Khong the xac minh OTP. Vui long thu lai sau.",
          traceId,
        },
        { status: 502 },
      );
    }

    if (!providerVerify.ok && providerVerify.code === "invalid_otp") {
      const consumeResult = await consumeOtpAttempt(
        adminSupabase,
        challenge.id,
        maxAttempts,
      );
      const shouldInvalidate = consumeResult.locked;

      return NextResponse.json(
        {
          error: shouldInvalidate
            ? "Ban da nhap sai OTP qua so lan cho phep. Vui long gui lai ma."
            : "Ma OTP khong dung.",
          remainingAttempts: shouldInvalidate
            ? 0
            : consumeResult.remainingAttempts,
          traceId,
        },
        { status: 400 },
      );
    }

    if (!providerVerify.ok && providerVerify.code === "request_not_found") {
      await adminSupabase
        .from("phone_otp_requests")
        .update({
          invalidated_at: new Date().toISOString(),
          failure_reason: "provider_request_not_found",
        })
        .eq("id", challenge.id);

      return NextResponse.json(
        {
          error: "Yeu cau OTP khong con hop le. Vui long gui lai ma moi.",
          traceId,
        },
        { status: 400 },
      );
    }

    if (!providerVerify.ok) {
      return NextResponse.json(
        {
          error: "Khong the xac minh OTP. Vui long thu lai sau.",
          traceId,
        },
        { status: 502 },
      );
    }

    if (purpose === "register") {
      const { data: existingProfile, error: existingError } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (existingError && !isSchemaMissingError(existingError)) {
        return NextResponse.json(
          { error: "Khong the kiem tra tai khoan hien co.", traceId },
          { status: 500 },
        );
      }

      if (existingProfile?.id) {
        return NextResponse.json(
          { error: "So dien thoai da ton tai.", traceId },
          { status: 409 },
        );
      }

      const loginEmail = buildOtpAliasEmail(phoneNumber);
      const { data: createdUser, error: createUserError } =
        await adminSupabase.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true,
          user_metadata: {
            phone_number: phoneNumber,
            auth_method: "phone_password",
          },
        });

      if (createUserError || !createdUser.user) {
        return NextResponse.json(
          {
            error:
              createUserError?.message ||
              "Khong the tao tai khoan moi tu so dien thoai.",
            traceId,
          },
          { status: 500 },
        );
      }

      const userId = createdUser.user.id;
      const { error: upsertProfileError } = await adminSupabase
        .from("profiles")
        .upsert({
          id: userId,
          is_active: true,
          phone_number: phoneNumber,
          phone_auth_expires_at: null,
        });

      if (upsertProfileError) {
        return NextResponse.json(
          { error: "Khong the khoi tao ho so nguoi dung.", traceId },
          { status: 500 },
        );
      }

      await adminSupabase
        .from("phone_otp_requests")
        .update({
          verified_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq("id", challenge.id);

      const { data: signInData, error: signInError } = await signInWithEmailPassword(
        loginEmail,
        password,
      );

      if (signInError || !signInData.session) {
        return NextResponse.json(
          {
            error:
              signInError?.message ||
              "Dang ky thanh cong nhung khong tao duoc phien dang nhap.",
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
          id: userId,
          phoneNumber,
        },
        traceId,
      });
    }

    const { data: existingProfile, error: profileError } = await adminSupabase
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

    if (!existingProfile?.id || !existingProfile.is_active) {
      return NextResponse.json(
        { error: "Khong tim thay tai khoan voi so dien thoai nay.", traceId },
        { status: 404 },
      );
    }

    const { data: userData, error: getUserError } =
      await adminSupabase.auth.admin.getUserById(existingProfile.id);

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
      await adminSupabase.auth.admin.updateUserById(existingProfile.id, {
        password,
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

    await adminSupabase
      .from("phone_otp_requests")
      .update({
        verified_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", challenge.id);

    const { data: signInData, error: signInError } = await signInWithEmailPassword(
      loginEmail,
      password,
    );

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
        id: existingProfile.id,
        phoneNumber,
      },
      traceId,
    });
  } catch (error) {
    otpLog("error", "otp_verify.unhandled_exception", {
      traceId,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau xac minh OTP.",
        traceId,
      },
      { status: 500 },
    );
  }
}
