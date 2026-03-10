import { createPost, deletePost, updatePost } from "@/utils/supabase/blog";
import { getIsAdmin } from "@/utils/supabase/queries";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/blog - Create a new blog post
 */
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await getIsAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const { post, categoryIds, tagIds } = await request.json();

        const result = await createPost(post, categoryIds || [], tagIds || []);

        if (!result) {
            return NextResponse.json(
                { error: "Failed to create post" },
                { status: 500 }
            );
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error({ error }, "Blog create failed");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
