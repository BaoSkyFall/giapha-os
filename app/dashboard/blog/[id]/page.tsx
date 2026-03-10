import {
    getCategories,
    getPostById,
    getTags,
} from "@/utils/supabase/blog";
import { getIsAdmin, getUser } from "@/utils/supabase/queries";
import { notFound, redirect } from "next/navigation";
import BlogEditorContent from "../BlogEditorContent";

export default async function EditBlogPostPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const user = await getUser();
    if (!user) redirect("/login");

    const { id } = await params;

    const [post, categories, tags] = await Promise.all([
        getPostById(id),
        getCategories(),
        getTags(),
    ]);

    if (!post) {
        notFound();
    }

    return (
        <BlogEditorContent
            post={post}
            categories={categories}
            tags={tags}
            authorId={user.id}
        />
    );
}
