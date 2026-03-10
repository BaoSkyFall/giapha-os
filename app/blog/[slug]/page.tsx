import {
    getPostBySlug,
    getRelatedPosts,
    incrementViews,
} from "@/utils/supabase/blog";
import { notFound } from "next/navigation";
import ArticleContent from "./ArticleContent";

export default async function ArticlePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    // Increment views (fire-and-forget)
    incrementViews(post.id).catch(() => { });

    const categoryIds = post.categories.map((c) => c.id);
    const relatedPosts = await getRelatedPosts(post.id, categoryIds, 3);

    return (
        <ArticleContent post={post} relatedPosts={relatedPosts} />
    );
}
