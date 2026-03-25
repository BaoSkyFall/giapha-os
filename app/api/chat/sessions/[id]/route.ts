import { getSupabase, getUser } from "@/utils/supabase/queries";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/chat/sessions/[id]
 * Returns full session with complete message history.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, messages, scratchpad, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      // RLS returns null for wrong user_id — surface as 404
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error({ error }, "GET /api/chat/sessions/[id] unexpected error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/sessions/[id]
 * Permanently deletes the session. RLS enforces ownership.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = await getSupabase();
    const { error, count } = await supabase
      .from("chat_sessions")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error({ error, id }, "DELETE /api/chat/sessions/[id] failed");
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    // count === 0 means session not found or belongs to another user (RLS blocked it)
    if (count === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error({ error }, "DELETE /api/chat/sessions/[id] unexpected error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
