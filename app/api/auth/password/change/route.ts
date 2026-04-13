import { buildOtpAliasEmail } from "@/utils/auth/otp";
import { isValidPhonePassword, PHONE_PASSWORD_LENGTH } from "@/utils/auth/password";
import { getRequestIp } from "@/utils/auth/request";
import { consumeRateLimit } from "@/utils/auth/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const getAnonClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase public auth configuration. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
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
    const currentPassword = payload?.currentPassword;
    const newPassword = payload?.newPassword;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Thong tin doi mat khau khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (
      !isValidPhonePassword(currentPassword) ||
      !isValidPhonePassword(newPassword)
    ) {
      return NextResponse.json(
        {
          error: `Mat khau phai gom dung ${PHONE_PASSWORD_LENGTH} chu so.`,
          traceId,
        },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          error: "Mat khau moi phai khac mat khau hien tai.",
          traceId,
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Ban chua dang nhap.", traceId },
        { status: 401 },
      );
    }

    const adminSupabase = createAdminClient();
    const limiter = await consumeRateLimit(
      adminSupabase,
      `password_change:user:${user.id}`,
      5,
      10 * 60,
    );
    const ipLimiter = await consumeRateLimit(
      adminSupabase,
      `password_change:ip_user:${ip}:${user.id}`,
      10,
      10 * 60,
    );
    if (!limiter.allowed || !ipLimiter.allowed) {
      const retryAfterSeconds = Math.max(
        limiter.retryAfterSeconds,
        ipLimiter.retryAfterSeconds,
      );
      return NextResponse.json(
        {
          error: "Ban da thu doi mat khau qua nhieu lan. Vui long thu lai sau.",
          retryAfterSeconds,
          traceId,
        },
        { status: 429 },
      );
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("phone_number")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Khong the tai thong tin tai khoan.", traceId },
        { status: 500 },
      );
    }

    const { data: userData, error: getUserError } =
      await adminSupabase.auth.admin.getUserById(user.id);

    if (getUserError || !userData.user) {
      return NextResponse.json(
        { error: "Khong the tai thong tin dang nhap.", traceId },
        { status: 500 },
      );
    }

    const loginEmail =
      userData.user.email ||
      (profile?.phone_number
        ? buildOtpAliasEmail(profile.phone_number)
        : null);

    if (!loginEmail) {
      return NextResponse.json(
        { error: "Tai khoan khong co email dang nhap hop le.", traceId },
        { status: 400 },
      );
    }

    const anonSupabase = getAnonClient();
    const { error: verifyCurrentError } = await anonSupabase.auth.signInWithPassword({
      email: loginEmail,
      password: currentPassword,
    });

    if (verifyCurrentError) {
      return NextResponse.json(
        { error: "Mat khau hien tai khong dung.", traceId },
        { status: 400 },
      );
    }

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      },
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Khong the doi mat khau.", traceId },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Doi mat khau thanh cong.",
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau doi mat khau.",
        traceId,
      },
      { status: 500 },
    );
  }
}
