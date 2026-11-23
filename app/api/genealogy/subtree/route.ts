import { createClient } from "@/utils/supabase/server";
import { fetchGenealogySubtree } from "@/utils/genealogyService";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 4;

export async function GET(request: NextRequest) {
  try {
    const rootId = request.nextUrl.searchParams.get("rootId")?.trim();
    const depthParam = Number.parseInt(
      request.nextUrl.searchParams.get("depth") ?? "",
      10,
    );
    const depth =
      Number.isFinite(depthParam) && depthParam > 0
        ? Math.min(depthParam, MAX_DEPTH)
        : DEFAULT_DEPTH;

    if (!rootId) {
      return NextResponse.json(
        { ok: false, error: "Thiếu rootId." },
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
        { ok: false, error: "Bạn chưa đăng nhập." },
        { status: 401 },
      );
    }

    const subtree = await fetchGenealogySubtree(supabase, rootId, depth);

    if (!subtree.rootPerson) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy người gốc chỉ định." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      rootId,
      depth,
      persons: subtree.persons,
      relationships: subtree.relationships,
    });
  } catch (error) {
    console.error("Error in /api/genealogy/subtree:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Lỗi hệ thống khi tải cây gia phả.",
      },
      { status: 500 },
    );
  }
}
