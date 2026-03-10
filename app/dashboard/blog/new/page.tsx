import { getCategories, getTags } from "@/utils/supabase/blog";
import { getIsAdmin, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import BlogEditorContent from "../BlogEditorContent";

export default async function NewBlogPostPage() {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const user = await getUser();
    if (!user) redirect("/login");

    const [categories, tags] = await Promise.all([
        getCategories(),
        getTags(),
    ]);

    return (
        <BlogEditorContent
            categories={categories}
            tags={tags}
            authorId={user.id}
        />
    );
}
