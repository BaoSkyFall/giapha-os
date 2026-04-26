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
    const password = payload?.password;

    if (typeof rawPhoneNumber !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Thong tin dang ky khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (!isValidPhonePassword(password)) {
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
      `phone_register:${phoneNumber}`,
      5,
      10 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      adminSupabase,
      `phone_register_ip:${ip}:${phoneNumber}`,
      10,
      10 * 60,
    );

    if (!limiter.allowed) {
      return NextResponse.json(
        {
          error: "Ban da thu dang ky qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds: limiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    if (!ipLimiter.allowed) {
      return NextResponse.json(
        {
          error: "Ban da thu dang ky qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds: ipLimiter.retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: existingProfile, error: existingError } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (existingError) {
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
      await adminSupabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: "Khong the khoi tao ho so nguoi dung.", traceId },
        { status: 500 },
      );
    }

    const anonSupabase = getAnonClient();
    const { data: signInData, error: signInError } =
      await anonSupabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

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
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau dang ky.",
        traceId,
      },
      { status: 500 },
    );
  }
}
