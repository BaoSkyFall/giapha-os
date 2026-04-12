import {
  OTP_EXPIRES_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND_LIMIT_DAY,
  OTP_SEND_LIMIT_HOUR,
  hashOtpCode,
} from "@/utils/auth/otp";
import { otpLog } from "@/utils/auth/log";
import { maskPhoneNumber, normalizeVietnamPhone } from "@/utils/auth/phone";
import { sendOtpSms } from "@/utils/auth/sms";
import { createAdminClient } from "@/utils/supabase/admin";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const isSchemaMissingError = (error: { code?: string; message?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message?.includes("phone_otp_requests") ||
  error.message?.includes("provider_request_id");

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    otpLog("info", "otp_send.request_start", { traceId });
    const payload = await request.json();
    const rawPhoneNumber = payload?.phoneNumber;

    if (typeof rawPhoneNumber !== "string") {
      otpLog("warn", "otp_send.invalid_phone_payload", { traceId });
      return NextResponse.json(
        { error: "So dien thoai khong hop le.", traceId },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeVietnamPhone(rawPhoneNumber);
    const maskedPhone = maskPhoneNumber(phoneNumber);
    otpLog("info", "otp_send.phone_normalized", { traceId, maskedPhone });

    const supabase = createAdminClient();

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const hourAgo = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

    const [hourWindow, dayWindow] = await Promise.all([
      supabase
        .from("phone_otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("phone_number", phoneNumber)
        .gte("sent_at", hourAgo),
      supabase
        .from("phone_otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("phone_number", phoneNumber)
        .gte("sent_at", dayAgo),
    ]);

    const hourCount = hourWindow.count || 0;
    const dayCount = dayWindow.count || 0;
    const hourError = hourWindow.error;
    const dayError = dayWindow.error;

    if (hourError || dayError) {
      const schemaError = hourError || dayError;
      otpLog("error", "otp_send.limit_query_failed", {
        traceId,
        maskedPhone,
        hourError,
        dayError,
      });

      if (schemaError && isSchemaMissingError(schemaError)) {
        return NextResponse.json(
          {
            error: "Thieu bang OTP. Vui long cap nhat schema SQL truoc khi dung dang nhap OTP.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the kiem tra gioi han gui OTP.", traceId },
        { status: 500 },
      );
    }

    otpLog("info", "otp_send.limit_counts", {
      traceId,
      maskedPhone,
      hourCount,
      dayCount,
    });

    if (hourCount >= OTP_SEND_LIMIT_HOUR) {
      otpLog("warn", "otp_send.hour_limit_reached", {
        traceId,
        maskedPhone,
        hourCount,
        limit: OTP_SEND_LIMIT_HOUR,
      });

      return NextResponse.json(
        {
          error: `Ban da vuot qua ${OTP_SEND_LIMIT_HOUR} lan gui OTP trong 1 gio.`,
          traceId,
        },
        { status: 429 },
      );
    }

    if (dayCount >= OTP_SEND_LIMIT_DAY) {
      otpLog("warn", "otp_send.day_limit_reached", {
        traceId,
        maskedPhone,
        dayCount,
        limit: OTP_SEND_LIMIT_DAY,
      });

      return NextResponse.json(
        {
          error: `Ban da vuot qua ${OTP_SEND_LIMIT_DAY} lan gui OTP trong 1 ngay.`,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: latestRequest, error: latestError } = await supabase
      .from("phone_otp_requests")
      .select("id,resend_available_at")
      .eq("phone_number", phoneNumber)
      .is("verified_at", null)
      .is("invalidated_at", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      otpLog("error", "otp_send.latest_query_failed", {
        traceId,
        maskedPhone,
        latestError,
      });

      if (isSchemaMissingError(latestError)) {
        return NextResponse.json(
          {
            error: "Thieu bang OTP. Vui long cap nhat schema SQL truoc khi dung dang nhap OTP.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the kiem tra trang thai OTP hien tai.", traceId },
        { status: 500 },
      );
    }

    if (latestRequest?.resend_available_at) {
      const resendAt = new Date(latestRequest.resend_available_at).getTime();
      if (resendAt > nowMs) {
        const resendAvailableIn = Math.ceil((resendAt - nowMs) / 1000);
        otpLog("warn", "otp_send.cooldown_active", {
          traceId,
          maskedPhone,
          resendAvailableIn,
        });

        return NextResponse.json(
          {
            error: "Vui long cho truoc khi gui lai OTP.",
            resendAvailableIn,
            traceId,
          },
          { status: 429 },
        );
      }
    }

    let providerRequestId = "";
    try {
      const sendResult = await sendOtpSms({ phoneNumber, traceId });
      providerRequestId = sendResult.requestId;
    } catch (smsError) {
      const message =
        smsError instanceof Error ? smsError.message : "send_sms_failed";

      otpLog("error", "otp_send.sms_failed", {
        traceId,
        maskedPhone,
        smsError: message,
      });

      return NextResponse.json(
        { error: "Khong the gui OTP. Vui long thu lai sau.", traceId },
        { status: 502 },
      );
    }

    const { error: invalidateError } = await supabase
      .from("phone_otp_requests")
      .update({ invalidated_at: nowIso })
      .eq("phone_number", phoneNumber)
      .is("verified_at", null)
      .is("invalidated_at", null);

    if (invalidateError && !isSchemaMissingError(invalidateError)) {
      otpLog("error", "otp_send.invalidate_previous_failed", {
        traceId,
        maskedPhone,
        invalidateError,
      });

      return NextResponse.json(
        { error: "Khong the lam moi trang thai OTP cu.", traceId },
        { status: 500 },
      );
    }

    const otpHash = hashOtpCode(phoneNumber, providerRequestId);
    const expiresAt = new Date(nowMs + OTP_EXPIRES_MS).toISOString();
    const resendAvailableAt = new Date(
      nowMs + OTP_RESEND_COOLDOWN_MS,
    ).toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("phone_otp_requests")
      .insert({
        phone_number: phoneNumber,
        provider_request_id: providerRequestId,
        otp_hash: otpHash,
        sent_at: nowIso,
        expires_at: expiresAt,
        resend_available_at: resendAvailableAt,
        attempts: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
      })
      .select("id")
      .single();

    if (insertError) {
      otpLog("error", "otp_send.insert_failed", {
        traceId,
        maskedPhone,
        insertError,
      });

      if (isSchemaMissingError(insertError)) {
        return NextResponse.json(
          {
            error: "Thieu bang OTP. Vui long cap nhat schema SQL truoc khi dung dang nhap OTP.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the tao phien OTP moi.", traceId },
        { status: 500 },
      );
    }

    otpLog("info", "otp_send.success", {
      traceId,
      maskedPhone,
      otpRequestId: inserted.id,
      providerRequestId,
    });

    return NextResponse.json({
      ok: true,
      message: "Da gui ma OTP.",
      maskedPhoneNumber: maskedPhone,
      resendAvailableIn: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
      expiresIn: Math.floor(OTP_EXPIRES_MS / 1000),
      traceId,
    });
  } catch (error) {
    otpLog("error", "otp_send.unhandled_exception", {
      traceId,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau gui OTP.",
        traceId,
      },
      { status: 500 },
    );
  }
}
