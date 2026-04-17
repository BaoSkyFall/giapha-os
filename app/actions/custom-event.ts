"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";

interface CustomEventPayload {
  name: string;
  event_date: string;
  location?: string | null;
  content?: string | null;
  status?: "draft" | "published";
}

function normalizePayload(payload: CustomEventPayload) {
  const status = payload.status === "draft" ? "draft" : "published";
  return {
    name: payload.name.trim(),
    event_date: payload.event_date,
    location: payload.location?.trim() || null,
    content: payload.content?.trim() || null,
    status,
  };
}

async function ensureAdminAccess() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Bạn không có quyền quản lý sự kiện." };
  }
  return { profile };
}

export async function createCustomEvent(payload: CustomEventPayload) {
  const auth = await ensureAdminAccess();
  if ("error" in auth) return auth;

  const normalized = normalizePayload(payload);
  if (!normalized.name || !normalized.event_date) {
    return { error: "Thiếu tên sự kiện hoặc ngày diễn ra." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("custom_events").insert([
    {
      ...normalized,
      created_by: auth.profile.id,
    },
  ]);

  if (error) {
    console.error("createCustomEvent error:", error);
    return { error: error.message || "Không thể thêm sự kiện." };
  }

  return { success: true as const };
}

export async function updateCustomEvent(
  eventId: string,
  payload: CustomEventPayload,
) {
  const auth = await ensureAdminAccess();
  if ("error" in auth) return auth;

  if (!eventId) {
    return { error: "Thiếu mã sự kiện." };
  }

  const normalized = normalizePayload(payload);
  if (!normalized.name || !normalized.event_date) {
    return { error: "Thiếu tên sự kiện hoặc ngày diễn ra." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("custom_events")
    .update(normalized)
    .eq("id", eventId);

  if (error) {
    console.error("updateCustomEvent error:", error);
    return { error: error.message || "Không thể cập nhật sự kiện." };
  }

  return { success: true as const };
}

export async function deleteCustomEvent(eventId: string) {
  const auth = await ensureAdminAccess();
  if ("error" in auth) return auth;

  if (!eventId) {
    return { error: "Thiếu mã sự kiện." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("custom_events").delete().eq("id", eventId);

  if (error) {
    console.error("deleteCustomEvent error:", error);
    return { error: error.message || "Không thể xóa sự kiện." };
  }

  return { success: true as const };
}
