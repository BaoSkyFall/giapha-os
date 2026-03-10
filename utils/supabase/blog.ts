import {
    BlogCategory,
    BlogPost,
    BlogPostStatus,
    BlogPostWithDetails,
    BlogTag,
} from "@/types";
import { getSupabase } from "@/utils/supabase/queries";
import { cache } from "react";

// ==========================================
// PUBLIC QUERIES
// ==========================================

/**
 * Get published blog posts with categories and tags.
 * Supports pagination, category filter, and search.
 */
export const getPublishedPosts = cache(
    async (
        page = 1,
        limit = 9,
        categorySlug?: string,
        search?: string
    ): Promise<{ posts: BlogPostWithDetails[]; total: number }> => {
        const supabase = await getSupabase();
        const offset = (page - 1) * limit;

        let query = supabase
            .from("blog_posts")
            .select(
                `*, blog_post_categories!inner(category_id, blog_categories(*)), blog_post_tags(tag_id, blog_tags(*))`,
                { count: "exact" }
            )
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.ilike("title", `%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.error({ error }, "Failed to fetch published posts");
            return { posts: [], total: 0 };
        }

        // If category filter, filter in JS after fetch (Supabase nested filter limitation)
        let posts = mapPostsWithDetails(data || []);

        if (categorySlug) {
            posts = posts.filter((p) =>
                p.categories.some((c) => c.slug === categorySlug)
            );
        }

        return { posts, total: count || 0 };
    }
);

/**
 * Get a single post by slug (public — only published).
 */
export const getPostBySlug = cache(
    async (slug: string): Promise<BlogPostWithDetails | null> => {
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from("blog_posts")
            .select(
                `*, blog_post_categories(category_id, blog_categories(*)), blog_post_tags(tag_id, blog_tags(*))`
            )
            .eq("slug", slug)
            .single();

        if (error || !data) {
            console.error({ error }, "Failed to fetch post by slug");
            return null;
        }

        const posts = mapPostsWithDetails([data]);
        return posts[0] || null;
    }
);

/**
 * Get related posts by matching categories (excluding current post).
 */
export const getRelatedPosts = cache(
    async (
        postId: string,
        categoryIds: string[],
        limit = 3
    ): Promise<BlogPostWithDetails[]> => {
        if (categoryIds.length === 0) return [];

        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from("blog_posts")
            .select(
                `*, blog_post_categories!inner(category_id, blog_categories(*)), blog_post_tags(tag_id, blog_tags(*))`
            )
            .eq("status", "published")
            .neq("id", postId)
            .in("blog_post_categories.category_id", categoryIds)
            .order("published_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error({ error }, "Failed to fetch related posts");
            return [];
        }

        return mapPostsWithDetails(data || []);
    }
);

/**
 * Increment view counter for a post.
 */
export async function incrementViews(postId: string): Promise<void> {
    const supabase = await getSupabase();
    await supabase.rpc("increment_blog_views", { post_id: postId });
}

// ==========================================
// ADMIN QUERIES
// ==========================================

/**
 * Get all posts for admin (all statuses).
 */
export const getAllPosts = cache(
    async (
        page = 1,
        limit = 10,
        status?: BlogPostStatus,
        search?: string
    ): Promise<{ posts: BlogPostWithDetails[]; total: number }> => {
        const supabase = await getSupabase();
        const offset = (page - 1) * limit;

        let query = supabase
            .from("blog_posts")
            .select(
                `*, blog_post_categories(category_id, blog_categories(*)), blog_post_tags(tag_id, blog_tags(*))`,
                { count: "exact" }
            )
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq("status", status);
        }

        if (search) {
            query = query.ilike("title", `%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.error({ error }, "Failed to fetch all posts");
            return { posts: [], total: 0 };
        }

        return { posts: mapPostsWithDetails(data || []), total: count || 0 };
    }
);

/**
 * Get blog stats for admin dashboard.
 */
export const getBlogStats = cache(async () => {
    const supabase = await getSupabase();

    const [totalRes, publishedRes, draftRes] = await Promise.all([
        supabase
            .from("blog_posts")
            .select("id", { count: "exact", head: true }),
        supabase
            .from("blog_posts")
            .select("id", { count: "exact", head: true })
            .eq("status", "published"),
        supabase
            .from("blog_posts")
            .select("id", { count: "exact", head: true })
            .eq("status", "draft"),
    ]);

    return {
        total: totalRes.count || 0,
        published: publishedRes.count || 0,
        draft: draftRes.count || 0,
    };
});

/**
 * Get a single post by ID for editing (admin).
 */
export const getPostById = cache(
    async (id: string): Promise<BlogPostWithDetails | null> => {
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from("blog_posts")
            .select(
                `*, blog_post_categories(category_id, blog_categories(*)), blog_post_tags(tag_id, blog_tags(*))`
            )
            .eq("id", id)
            .single();

        if (error || !data) {
            console.error({ error }, "Failed to fetch post by id");
            return null;
        }

        const posts = mapPostsWithDetails([data]);
        return posts[0] || null;
    }
);

/**
 * Create a new blog post.
 */
export async function createPost(
    post: Partial<BlogPost>,
    categoryIds: string[],
    tagIds: string[]
): Promise<BlogPost | null> {
    const supabase = await getSupabase();

    const { data, error } = await supabase
        .from("blog_posts")
        .insert(post)
        .select()
        .single();

    if (error || !data) {
        console.error({ error }, "Failed to create post");
        return null;
    }

    // Link categories
    if (categoryIds.length > 0) {
        await supabase.from("blog_post_categories").insert(
            categoryIds.map((cid) => ({
                post_id: data.id,
                category_id: cid,
            }))
        );
    }

    // Link tags
    if (tagIds.length > 0) {
        await supabase.from("blog_post_tags").insert(
            tagIds.map((tid) => ({
                post_id: data.id,
                tag_id: tid,
            }))
        );
    }

    return data as BlogPost;
}

/**
 * Update an existing blog post.
 */
export async function updatePost(
    id: string,
    post: Partial<BlogPost>,
    categoryIds: string[],
    tagIds: string[]
): Promise<BlogPost | null> {
    const supabase = await getSupabase();

    const { data, error } = await supabase
        .from("blog_posts")
        .update(post)
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
        console.error({ error }, "Failed to update post");
        return null;
    }

    // Replace categories
    await supabase
        .from("blog_post_categories")
        .delete()
        .eq("post_id", id);

    if (categoryIds.length > 0) {
        await supabase.from("blog_post_categories").insert(
            categoryIds.map((cid) => ({
                post_id: id,
                category_id: cid,
            }))
        );
    }

    // Replace tags
    await supabase.from("blog_post_tags").delete().eq("post_id", id);

    if (tagIds.length > 0) {
        await supabase.from("blog_post_tags").insert(
            tagIds.map((tid) => ({
                post_id: id,
                tag_id: tid,
            }))
        );
    }

    return data as BlogPost;
}

/**
 * Delete a blog post.
 */
export async function deletePost(id: string): Promise<boolean> {
    const supabase = await getSupabase();

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (error) {
        console.error({ error }, "Failed to delete post");
        return false;
    }

    return true;
}

// ==========================================
// SHARED QUERIES
// ==========================================

/**
 * Get all blog categories.
 */
export const getCategories = cache(
    async (): Promise<BlogCategory[]> => {
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from("blog_categories")
            .select("*")
            .order("name");

        if (error) {
            console.error({ error }, "Failed to fetch categories");
            return [];
        }

        return (data as BlogCategory[]) || [];
    }
);

/**
 * Get all blog tags.
 */
export const getTags = cache(
    async (): Promise<BlogTag[]> => {
        const supabase = await getSupabase();

        const { data, error } = await supabase
            .from("blog_tags")
            .select("*")
            .order("name");

        if (error) {
            console.error({ error }, "Failed to fetch tags");
            return [];
        }

        return (data as BlogTag[]) || [];
    }
);

/**
 * Create a new tag (admin).
 */
export async function createTag(name: string): Promise<BlogTag | null> {
    const supabase = await getSupabase();

    const { data, error } = await supabase
        .from("blog_tags")
        .insert({ name })
        .select()
        .single();

    if (error) {
        console.error({ error }, "Failed to create tag");
        return null;
    }

    return data as BlogTag;
}

// ==========================================
// HELPERS
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPostsWithDetails(rawPosts: any[]): BlogPostWithDetails[] {
    return rawPosts.map((post) => {
        const categories: BlogCategory[] = (
            post.blog_post_categories || []
        )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((pc: any) => pc.blog_categories)
            .filter(Boolean);

        const tags: BlogTag[] = (post.blog_post_tags || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((pt: any) => pt.blog_tags)
            .filter(Boolean);

        // Remove junction data from result
        const {
            blog_post_categories: _pc,
            blog_post_tags: _pt,
            ...postData
        } = post;

        return {
            ...postData,
            categories,
            tags,
            author: post.author_id
                ? { id: post.author_id }
                : null,
        } as BlogPostWithDetails;
    });
}
