import { uploadImage } from "@/utils/cloudinary";
import { getIsAdmin } from "@/utils/supabase/queries";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const isAdmin = await getIsAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const folder = (formData.get("folder") as string) || "blog/content";

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Only image files are allowed" },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "File too large (max 10MB)" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await uploadImage(buffer, folder);

        return NextResponse.json({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
        });
    } catch (error) {
        console.error({ error }, "Image upload failed");
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        );
    }
}
