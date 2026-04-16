import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  isAllowedBranch,
  isAllowedGeneration,
} from "@/utils/auth/profile";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const isSchemaMissingError = (error: { code?: string; message?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message?.includes("profiles") ||
  error.message?.includes("full_name") ||
  error.message?.includes("birth_year") ||
  error.message?.includes("branch") ||
  error.message?.includes("generation") ||
  error.message?.includes("address") ||
  error.message?.includes("profile_completed_at");

const parseOptionalInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return Number.NaN;

  return parsed;
};

export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    const payload = await request.json();
    const fullName =
      typeof payload?.fullName === "string" ? payload.fullName.trim() : "";
    const birthYear = parseOptionalInt(payload?.birthYear);
    const birthMonth = parseOptionalInt(payload?.birthMonth);
    const birthDay = parseOptionalInt(payload?.birthDay);
    const branch = typeof payload?.branch === "string" ? payload.branch.trim() : "";
    const generation = parseOptionalInt(payload?.generation);
    const address =
      typeof payload?.address === "string" && payload.address.trim()
        ? payload.address.trim()
        : null;

    if (!fullName) {
      return NextResponse.json(
        { error: "Ho va ten la bat buoc.", traceId },
        { status: 400 },
      );
    }

    if (!Number.isInteger(birthYear) || (birthYear || 0) < 1900 || (birthYear || 0) > 2100) {
      return NextResponse.json(
        {
          error: "Nam sinh khong hop le (1900-2100).",
          traceId,
        },
        { status: 400 },
      );
    }

    if (birthMonth !== null && (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12)) {
      return NextResponse.json(
        { error: "Thang sinh khong hop le (1-12).", traceId },
        { status: 400 },
      );
    }

    if (birthDay !== null && (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 31)) {
      return NextResponse.json(
        { error: "Ngay sinh khong hop le (1-31).", traceId },
        { status: 400 },
      );
    }

    if (birthDay !== null && birthMonth === null) {
      return NextResponse.json(
        { error: "Can nhap thang neu co ngay sinh.", traceId },
        { status: 400 },
      );
    }

    if (birthDay !== null && birthMonth !== null) {
      const daysInMonth = new Date(birthYear || 2000, birthMonth, 0).getDate();
      if (birthDay > daysInMonth) {
        return NextResponse.json(
          { error: "Ngay sinh khong ton tai trong thang da chon.", traceId },
          { status: 400 },
        );
      }
    }

    if (!branch) {
      return NextResponse.json(
        { error: "Nhanh la bat buoc.", traceId },
        { status: 400 },
      );
    }

    if (!isAllowedBranch(branch)) {
      return NextResponse.json(
        { error: "Nhanh khong hop le.", traceId },
        { status: 400 },
      );
    }

    if (!Number.isInteger(generation) || !isAllowedGeneration(generation || 0)) {
      return NextResponse.json(
        { error: "Doi thu khong hop le (1-15).", traceId },
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

    const { data: currentProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      if (isSchemaMissingError(profileError)) {
        return NextResponse.json(
          {
            error: "Thieu cot profile onboarding. Vui long cap nhat schema SQL.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the kiem tra ho so hien tai.", traceId },
        { status: 500 },
      );
    }

    if (currentProfile?.role === "admin") {
      return NextResponse.json(
        { error: "Tai khoan quan tri khong dung luong onboarding OTP.", traceId },
        { status: 403 },
      );
    }

    if (!currentProfile) {
      return NextResponse.json(
        { error: "Khong tim thay ho so nguoi dung.", traceId },
        { status: 404 },
      );
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({
        full_name: fullName,
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
        branch,
        generation,
        address,
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      if (isSchemaMissingError(updateError)) {
        return NextResponse.json(
          {
            error: "Thieu cot profile onboarding. Vui long cap nhat schema SQL.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Khong the cap nhat ho so nguoi dung.", traceId },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Cap nhat thong tin thanh cong.",
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the xu ly yeu cau cap nhat ho so.",
        traceId,
      },
      { status: 500 },
    );
  }
}
