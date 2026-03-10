"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BlogCategory, BlogPostWithDetails } from "@/types";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Search,
    Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface BlogListContentProps {
    featuredPost: BlogPostWithDetails | null;
    posts: BlogPostWithDetails[];
    categories: BlogCategory[];
    total: number;
    currentPage: number;
    currentCategory?: string;
    currentSearch?: string;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function readingTime(content: string | null): string {
    if (!content) return "1 phút đọc";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} phút đọc`;
}

export default function BlogListContent({
    featuredPost,
    posts,
    categories,
    total,
    currentPage,
    currentCategory,
    currentSearch,
}: BlogListContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchInput, setSearchInput] = useState(currentSearch || "");

    const totalPages = Math.ceil(total / 9);

    const buildUrl = (overrides: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(overrides)) {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }
        // Reset page when changing filters
        if ("category" in overrides || "search" in overrides) {
            params.delete("page");
        }
        const qs = params.toString();
        return `/blog${qs ? `?${qs}` : ""}`;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(buildUrl({ search: searchInput || undefined }));
    };

    return (
        <div className="min-h-screen bg-rice-paper text-altar-wood font-sans">
            <Header siteName="Tộc Phạm Phú" />

            <main className="max-w-7xl mx-auto px-4 py-12">
                {/* Page Title */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-altar-wood mb-4">
                        Tin Tức & Bài Viết
                    </h1>
                    <div className="w-24 h-1 bg-heritage-gold mx-auto rounded-full" />
                    <p className="mt-4 text-altar-wood/60 max-w-2xl mx-auto">
                        Lưu giữ tinh hoa và truyền thống dòng họ qua từng trang
                        viết
                    </p>
                </motion.div>

                {/* Featured Article */}
                {featuredPost && (
                    <motion.div
                        className="mb-12"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Link
                            href={`/blog/${featuredPost.slug}`}
                            className="block group"
                        >
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-heritage-gold/10 hover:shadow-lg transition-all flex flex-col md:flex-row">
                                <div className="md:w-3/5 aspect-[16/9] bg-heritage-red/5 relative overflow-hidden">
                                    {featuredPost.cover_image_url ? (
                                        <img
                                            src={featuredPost.cover_image_url}
                                            alt={featuredPost.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            style={featuredPost.is_featured ? { objectPosition: "0 8%" } : undefined}
                                        />
                                    ) : (
                                        <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-heritage-red/10 to-heritage-gold/10">
                                            <span className="text-heritage-gold/40 text-6xl font-serif">
                                                族
                                            </span>
                                        </div>
                                    )}
                                    {featuredPost.is_featured && (
                                        <span className="absolute top-4 left-4 px-3 py-1 bg-heritage-gold text-white text-xs font-bold rounded-full">
                                            ⭐ Nổi bật
                                        </span>
                                    )}
                                </div>
                                <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-3">
                                        {featuredPost.categories
                                            .slice(0, 1)
                                            .map((cat) => (
                                                <span
                                                    key={cat.id}
                                                    className={`${cat.color} px-2.5 py-1 rounded-full text-xs font-bold`}
                                                >
                                                    {cat.name}
                                                </span>
                                            ))}
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-altar-wood group-hover:text-heritage-red transition-colors mb-3">
                                        {featuredPost.title}
                                    </h2>
                                    <p className="text-altar-wood/60 text-sm mb-4 line-clamp-3">
                                        {featuredPost.excerpt}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-altar-wood/40">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            {formatDate(
                                                featuredPost.published_at
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {readingTime(
                                                featuredPost.content
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* Categories + Search */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={buildUrl({ category: undefined })}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!currentCategory
                                ? "bg-heritage-red text-white"
                                : "bg-white text-altar-wood/60 hover:bg-heritage-red/10 border border-heritage-gold/10"
                                }`}
                        >
                            Tất cả
                        </Link>
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                href={buildUrl({ category: cat.slug })}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentCategory === cat.slug
                                    ? "bg-heritage-red text-white"
                                    : "bg-white text-altar-wood/60 hover:bg-heritage-red/10 border border-heritage-gold/10"
                                    }`}
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </div>
                    <form onSubmit={handleSearch} className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-altar-wood/40" />
                        <input
                            type="text"
                            placeholder="Tìm bài viết..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-full border border-heritage-gold/20 bg-white text-sm focus:ring-heritage-red focus:border-heritage-red placeholder:text-altar-wood/30"
                        />
                    </form>
                </div>

                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {posts.map((post, i) => (
                        <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                        >
                            <Link
                                href={`/blog/${post.slug}`}
                                className="group block bg-white rounded-xl overflow-hidden border border-heritage-gold/10 shadow-sm hover:shadow-md transition-all h-full"
                            >
                                <div className="aspect-[16/10] bg-heritage-red/5 relative overflow-hidden">
                                    {post.cover_image_url ? (
                                        <img
                                            src={post.cover_image_url}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-heritage-red/5 to-heritage-gold/5">
                                            <span className="text-heritage-gold/30 text-4xl font-serif">
                                                族
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        {post.categories
                                            .slice(0, 1)
                                            .map((cat) => (
                                                <span
                                                    key={cat.id}
                                                    className={`${cat.color} px-2 py-0.5 rounded-full text-[10px] font-bold`}
                                                >
                                                    {cat.name}
                                                </span>
                                            ))}
                                    </div>
                                    <h3 className="font-bold text-altar-wood group-hover:text-heritage-red transition-colors mb-2 line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <p className="text-sm text-altar-wood/50 line-clamp-2 mb-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-altar-wood/40">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            {formatDate(post.published_at)}
                                        </span>
                                        <span className="flex items-center gap-1 text-heritage-red font-medium group-hover:gap-2 transition-all">
                                            Đọc thêm
                                            <ArrowRight className="size-3" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.article>
                    ))}
                </div>

                {posts.length === 0 && !featuredPost && (
                    <div className="text-center py-20 text-altar-wood/40">
                        <Tag className="size-10 mx-auto mb-3" />
                        <p className="font-medium text-lg">
                            Chưa có bài viết nào
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <Link
                            href={buildUrl({
                                page:
                                    currentPage > 1
                                        ? String(currentPage - 1)
                                        : undefined,
                            })}
                            className={`p-2 rounded-lg border ${currentPage <= 1
                                ? "border-heritage-gold/10 text-altar-wood/20 pointer-events-none"
                                : "border-heritage-gold/20 text-altar-wood/60 hover:bg-heritage-red/5"
                                }`}
                        >
                            <ChevronLeft className="size-5" />
                        </Link>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                            (p) => (
                                <Link
                                    key={p}
                                    href={buildUrl({ page: String(p) })}
                                    className={`size-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === currentPage
                                        ? "bg-heritage-red text-white"
                                        : "border border-heritage-gold/20 text-altar-wood/60 hover:bg-heritage-red/5"
                                        }`}
                                >
                                    {p}
                                </Link>
                            )
                        )}
                        <Link
                            href={buildUrl({
                                page:
                                    currentPage < totalPages
                                        ? String(currentPage + 1)
                                        : undefined,
                            })}
                            className={`p-2 rounded-lg border ${currentPage >= totalPages
                                ? "border-heritage-gold/10 text-altar-wood/20 pointer-events-none"
                                : "border-heritage-gold/20 text-altar-wood/60 hover:bg-heritage-red/5"
                                }`}
                        >
                            <ChevronRight className="size-5" />
                        </Link>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
