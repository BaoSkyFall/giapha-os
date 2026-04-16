"use server";

import { UserRole } from "@/types";
import { isAllowedBranch, isAllowedGeneration } from "@/utils/auth/profile";
import { normalizeVietnamPhone } from "@/utils/auth/phone";
import { getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

type CreateMode = "basic" | "advanced";

const parseOptionalInt = (value: FormDataEntryValue | null) => {
  if (value == null) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return Number.NaN;
  return parsed;
};

const isValidRole = (role: string): role is Exclude<UserRole, "user"> =>
  role === "admin" || role === "editor" || role === "member";

export async function changeUserRole(userId: string, newRole: UserRole) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to change user role:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_user", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Failed to delete user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  const modeRaw = formData.get("creation_mode")?.toString();
  const creationMode: CreateMode = modeRaw === "advanced" ? "advanced" : "basic";
  const roleRaw = formData.get("role")?.toString() || "member";
  const isActive = formData.get("is_active")?.toString() !== "false";
  const phoneInput = formData.get("phone_number")?.toString();

  if (!isValidRole(roleRaw)) {
    return { error: "Vai trò không hợp lệ." };
  }

  if (!phoneInput) {
    return { error: "Số điện thoại là bắt buộc." };
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeVietnamPhone(phoneInput);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Số điện thoại không hợp lệ.",
    };
  }

  let fullName: string | null = null;
  let birthYear: number | null = null;
  let birthMonth: number | null = null;
  let birthDay: number | null = null;
  let branch: string | null = null;
  let generation: number | null = null;
  let address: string | null = null;

  if (creationMode === "advanced") {
    fullName = formData.get("full_name")?.toString().trim() || null;
    birthYear = parseOptionalInt(formData.get("birth_year"));
    birthMonth = parseOptionalInt(formData.get("birth_month"));
    birthDay = parseOptionalInt(formData.get("birth_day"));
    branch = formData.get("branch")?.toString().trim() || null;
    generation = parseOptionalInt(formData.get("generation"));
    address = formData.get("address")?.toString().trim() || null;

    if (!fullName) {
      return { error: "Họ và tên là bắt buộc ở chế độ nâng cao." };
    }

    if (
      !Number.isInteger(birthYear) ||
      (birthYear || 0) < 1900 ||
      (birthYear || 0) > 2100
    ) {
      return { error: "Năm sinh không hợp lệ (1900-2100)." };
    }

    if (
      birthMonth !== null &&
      (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12)
    ) {
      return { error: "Tháng sinh không hợp lệ (1-12)." };
    }

    if (birthDay !== null && birthMonth === null) {
      return { error: "Cần nhập tháng nếu có ngày sinh." };
    }

    if (
      birthDay !== null &&
      (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 31)
    ) {
      return { error: "Ngày sinh không hợp lệ (1-31)." };
    }

    if (birthDay !== null && birthMonth !== null) {
      const daysInMonth = new Date(birthYear || 2000, birthMonth, 0).getDate();
      if (birthDay > daysInMonth) {
        return { error: "Ngày sinh không tồn tại trong tháng đã chọn." };
      }
    }

    if (!branch || !isAllowedBranch(branch)) {
      return { error: "Nhánh không hợp lệ." };
    }

    if (!Number.isInteger(generation) || !isAllowedGeneration(generation || 0)) {
      return { error: "Đời thứ không hợp lệ (1-15)." };
    }
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("admin_create_phone_user", {
    new_phone_number: normalizedPhone,
    new_role: roleRaw,
    new_active: isActive,
    profile_mode: creationMode,
    new_full_name: fullName,
    new_birth_year: birthYear,
    new_birth_month: birthMonth,
    new_birth_day: birthDay,
    new_branch: branch,
    new_generation: generation,
    new_address: address,
  });

  if (error) {
    console.error("Failed to create user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_active_status", {
    target_user_id: userId,
    new_status: newStatus,
  });

  if (error) {
    console.error("Failed to change user status:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function resetUserPassword(userId: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("admin_reset_user_password", {
    target_user_id: userId,
    reset_password: "000000",
  });

  if (error) {
    console.error("Failed to reset user password:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}
