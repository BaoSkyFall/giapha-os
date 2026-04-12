import {
  OTP_MAX_ATTEMPTS,
  OTP_SESSION_MAX_AGE_MS,
  buildOtpAliasEmail,
  deriveOtpPassword,
} from "@/utils/auth/otp";
import { otpLog } from "@/utils/auth/log";
import { maskPhoneNumber, normalizeVietnamPhone } from "@/utils/auth/phone";
import { verifyOtpWithProvider } from "@/utils/auth/sms";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const isSchemaMissingError = (error: { code?: string; message?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message?.includes("phone_otp_requests") ||
  error.message?.includes("phone_auth_expires_at") ||
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

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    otpLog("info", "otp_verify.request_start", { traceId });
    const payload = await request.json();
    const rawPhoneNumber = payload?.phoneNumber;
    const code = payload?.code;

    if (typeof rawPhoneNumber !== "string" || typeof code !== "string") {
      otpLog("warn", "otp_verify.invalid_payload", { traceId });
      return NextResponse.json(
        { error: "Thong tin xac thuc khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      otpLog("warn", "otp_verify.invalid_code_format", { traceId });
      return NextResponse.json(
        { error: "Ma OTP phai gom dung 6 chu so.", traceId },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const maskedPhone = maskPhoneNumber(phoneNumber);
    const adminSupabase = createAdminClient();

    otpLog("info", "otp_verify.phone_normalized", { traceId, maskedPhone });

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
            error: "Thieu bang OTP. Vui long cap nhat schema SQL truoc khi dung dang nhap OTP.",
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
      const nextAttempts = (challenge.attempts || 0) + 1;
      const shouldInvalidate = nextAttempts >= maxAttempts;

      await adminSupabase
        .from("phone_otp_requests")
        .update({
          attempts: nextAttempts,
          invalidated_at: shouldInvalidate ? new Date().toISOString() : null,
          failure_reason: shouldInvalidate ? "attempt_limit_reached" : null,
        })
        .eq("id", challenge.id);

      otpLog("warn", "otp_verify.code_invalid", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
        providerRequestId: challenge.provider_request_id,
        nextAttempts,
        maxAttempts,
        providerStatus: providerVerify.httpStatus,
        providerMessage: providerVerify.message,
      });

      return NextResponse.json(
        {
          error: shouldInvalidate
            ? "Ban da nhap sai OTP qua so lan cho phep. Vui long gui lai ma."
            : "Ma OTP khong dung.",
          remainingAttempts: shouldInvalidate
            ? 0
            : Math.max(0, maxAttempts - nextAttempts),
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

      otpLog("warn", "otp_verify.provider_request_not_found", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
        providerRequestId: challenge.provider_request_id,
        providerStatus: providerVerify.httpStatus,
        providerMessage: providerVerify.message,
      });

      return NextResponse.json(
        {
          error: "Yeu cau OTP khong con hop le. Vui long gui lai ma moi.",
          traceId,
        },
        { status: 400 },
      );
    }

    if (!providerVerify.ok) {
      otpLog("error", "otp_verify.provider_error", {
        traceId,
        maskedPhone,
        otpRequestId: challenge.id,
        providerRequestId: challenge.provider_request_id,
        providerStatus: providerVerify.httpStatus,
        providerMessage: providerVerify.message,
      });

      return NextResponse.json(
        {
          error: "Khong the xac minh OTP. Vui long thu lai sau.",
          traceId,
        },
        { status: 502 },
      );
    }

    await adminSupabase
      .from("phone_otp_requests")
      .update({
        verified_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", challenge.id);

    const { data: existingProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id,role")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (profileError && !isSchemaMissingError(profileError)) {
      otpLog("error", "otp_verify.profile_query_failed", {
        traceId,
        maskedPhone,
        profileError,
      });
      return NextResponse.json(
        { error: "Khong the kiem tra tai khoan hien co.", traceId },
        { status: 500 },
      );
    }

    if (existingProfile?.role === "admin") {
      otpLog("warn", "otp_verify.admin_blocked", {
        traceId,
        maskedPhone,
        profileId: existingProfile.id,
      });
      return NextResponse.json(
        {
          error:
            "Tai khoan quan tri vui long dang nhap qua trang quan tri bang email va mat khau.",
          traceId,
        },
        { status: 403 },
      );
    }

    const otpPassword = deriveOtpPassword(phoneNumber);
    let userId = existingProfile?.id || null;
    let loginEmail = "";

    if (userId) {
      const { data: userData, error: getUserError } =
        await adminSupabase.auth.admin.getUserById(userId);

      if (getUserError || !userData.user) {
        otpLog("error", "otp_verify.get_user_failed", {
          traceId,
          maskedPhone,
          userId,
          getUserError,
        });
        return NextResponse.json(
          { error: "Khong the tai thong tin tai khoan.", traceId },
          { status: 500 },
        );
      }

      loginEmail = userData.user.email || buildOtpAliasEmail(phoneNumber);

      const metadata = {
        ...(userData.user.user_metadata || {}),
        phone_number: phoneNumber,
        auth_method: "phone_otp",
      };

      const { error: updateUserError } =
        await adminSupabase.auth.admin.updateUserById(userId, {
          password: otpPassword,
          email: loginEmail,
          email_confirm: true,
          user_metadata: metadata,
        });

      if (updateUserError) {
        otpLog("error", "otp_verify.update_user_failed", {
          traceId,
          maskedPhone,
          userId,
          updateUserError,
        });
        return NextResponse.json(
          {
            error: "Khong the dong bo thong tin OTP cho tai khoan hien co.",
            traceId,
          },
          { status: 500 },
        );
      }
    } else {
      loginEmail = buildOtpAliasEmail(phoneNumber);

      const { data: createdUser, error: createUserError } =
        await adminSupabase.auth.admin.createUser({
          email: loginEmail,
          password: otpPassword,
          email_confirm: true,
          user_metadata: {
            phone_number: phoneNumber,
            auth_method: "phone_otp",
          },
        });

      if (createUserError || !createdUser.user) {
        otpLog("error", "otp_verify.create_user_failed", {
          traceId,
          maskedPhone,
          createUserError,
        });
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

      userId = createdUser.user.id;
    }

    const phoneAuthExpiresAt = new Date(
      Date.now() + OTP_SESSION_MAX_AGE_MS,
    ).toISOString();

    const { data: updatedProfile, error: profileUpdateError } =
      await adminSupabase
        .from("profiles")
        .update({
          phone_number: phoneNumber,
          phone_auth_expires_at: phoneAuthExpiresAt,
        })
        .eq("id", userId)
        .select("id")
        .maybeSingle();

    if (profileUpdateError && !isSchemaMissingError(profileUpdateError)) {
      otpLog("error", "otp_verify.profile_update_failed", {
        traceId,
        maskedPhone,
        userId,
        profileUpdateError,
      });
      return NextResponse.json(
        { error: "Khong the cap nhat trang thai xac thuc OTP.", traceId },
        { status: 500 },
      );
    }

    if (!updatedProfile) {
      const { error: profileInsertError } = await adminSupabase
        .from("profiles")
        .upsert({
          id: userId,
          is_active: true,
          phone_number: phoneNumber,
          phone_auth_expires_at: phoneAuthExpiresAt,
        });

      if (profileInsertError) {
        otpLog("error", "otp_verify.profile_upsert_failed", {
          traceId,
          maskedPhone,
          userId,
          profileInsertError,
        });
        return NextResponse.json(
          { error: "Khong the khoi tao ho so nguoi dung OTP.", traceId },
          { status: 500 },
        );
      }
    }

    const anonSupabase = getAnonClient();
    const { data: signInData, error: signInError } =
      await anonSupabase.auth.signInWithPassword({
        email: loginEmail,
        password: otpPassword,
      });

    if (signInError || !signInData.session) {
      otpLog("error", "otp_verify.signin_failed", {
        traceId,
        maskedPhone,
        userId,
        signInError,
      });

      return NextResponse.json(
        {
          error:
            signInError?.message ||
            "Xac thuc OTP thanh cong nhung khong tao duoc phien dang nhap.",
          traceId,
        },
        { status: 500 },
      );
    }

    otpLog("info", "otp_verify.success", {
      traceId,
      maskedPhone,
      userId,
    });

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
        phoneAuthExpiresAt,
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
