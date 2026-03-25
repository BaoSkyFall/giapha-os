import { getSupabase, getUser } from "@/utils/supabase/queries";
import { NextResponse } from "next/server";

/**
 * GET /api/chat/sessions
 * Returns list of authenticated user's chat sessions (no messages for perf).
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error({ error }, "GET /api/chat/sessions failed");
      return NextResponse.json(
        { error: "Failed to load sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    console.error({ error }, "GET /api/chat/sessions unexpected error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
