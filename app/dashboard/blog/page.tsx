import { getAllPosts, getBlogStats } from "@/utils/supabase/blog";
import { getIsAdmin } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import AdminBlogListContent from "./AdminBlogListContent";

export default async function AdminBlogListPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        status?: string;
        search?: string;
    }>;
}) {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const status = params.status as "published" | "draft" | undefined;
    const search = params.search;

    const [{ posts, total }, stats] = await Promise.all([
        getAllPosts(page, 10, status, search),
        getBlogStats(),
    ]);

    return (
        <AdminBlogListContent
            posts={posts}
            total={total}
            stats={stats}
            currentPage={page}
            currentStatus={status}
            currentSearch={search}
        />
    );
}
