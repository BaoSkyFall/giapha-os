import { deletePost, updatePost } from "@/utils/supabase/blog";
import { getIsAdmin } from "@/utils/supabase/queries";
import { NextRequest, NextResponse } from "next/server";

/**
 * PUT /api/blog/[id] - Update a blog post
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await getIsAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const { post, categoryIds, tagIds } = await request.json();

        const result = await updatePost(
            id,
            post,
            categoryIds || [],
            tagIds || []
        );

        if (!result) {
            return NextResponse.json(
                { error: "Failed to update post" },
                { status: 500 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error({ error }, "Blog update failed");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/blog/[id] - Delete a blog post
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await getIsAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const success = await deletePost(id);

        if (!success) {
            return NextResponse.json(
                { error: "Failed to delete post" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error({ error }, "Blog delete failed");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
