import {
    getCategories,
    getPublishedPosts,
} from "@/utils/supabase/blog";
import BlogListContent from "./BlogListContent";

export default async function BlogPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        category?: string;
        search?: string;
    }>;
}) {
    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const categorySlug = params.category;
    const search = params.search;

    const [{ posts, total }, categories] = await Promise.all([
        getPublishedPosts(page, 9, categorySlug, search),
        getCategories(),
    ]);

    const featuredPost = posts.find((p) => p.is_featured) || posts[0] || null;
    const remainingPosts = posts.filter((p) => p.id !== featuredPost?.id);

    return (
        <BlogListContent
            featuredPost={featuredPost}
            posts={remainingPosts}
            categories={categories}
            total={total}
            currentPage={page}
            currentCategory={categorySlug}
            currentSearch={search}
        />
    );
}
