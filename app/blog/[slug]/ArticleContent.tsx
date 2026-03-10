"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BlogPostWithDetails } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    Calendar,
    Check,
    Clock,
    Copy,
    Eye,
    Facebook,
    Share2,
    Tag,
    Twitter,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ArticleContentProps {
    post: BlogPostWithDetails;
    relatedPosts: BlogPostWithDetails[];
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

export default function ArticleContent({
    post,
    relatedPosts,
}: ArticleContentProps) {
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const articleUrl = typeof window !== "undefined"
        ? `${window.location.origin}/blog/${post.slug}`
        : `/blog/${post.slug}`;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
                setShowShareMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleShare = async () => {
        // Use native Web Share API on iPhone/mobile for easy sharing to any app
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.excerpt || post.title,
                    url: articleUrl,
                });
                return;
            } catch {
                // User cancelled or share failed, fall through to show dropdown
            }
        }
        setShowShareMenu((prev) => !prev);
    };

    const shareToFacebook = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
            "_blank",
            "noopener,noreferrer,width=600,height=400"
        );
        setShowShareMenu(false);
    };

    const shareToTwitter = () => {
        window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(post.title)}`,
            "_blank",
            "noopener,noreferrer,width=600,height=400"
        );
        setShowShareMenu(false);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(articleUrl);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setShowShareMenu(false);
            }, 1500);
        } catch {
            setShowShareMenu(false);
        }
    };
    return (
        <div className="min-h-screen bg-rice-paper text-altar-wood font-sans">
            <Header siteName="Tộc Phạm Phú" />

            {/* Hero */}
            <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
                {post.cover_image_url ? (
                    <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover lg:object-contain"
                        style={post.is_featured && isMobile ? { objectPosition: "0 8%" } : undefined}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-heritage-red/20 to-heritage-gold/10 flex items-center justify-center">
                        <span className="text-heritage-gold/30 text-9xl font-serif">
                            族
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-altar-wood/80 via-altar-wood/30 to-transparent" />
            </div>

            <main className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
                {/* Article Meta Card */}
                <motion.div
                    className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-heritage-gold/10 mb-8"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        {post.categories.map((cat) => (
                            <Link
                                key={cat.id}
                                href={`/blog?category=${cat.slug}`}
                                className={`${cat.color} px-3 py-1 rounded-full text-xs font-bold hover:opacity-80 transition-opacity`}
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-altar-wood mb-4">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-altar-wood/50">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="size-4" />
                            {formatDate(post.published_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-4" />
                            {readingTime(post.content)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Eye className="size-4" />
                            {post.views.toLocaleString()} lượt xem
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                            <div className="relative" ref={shareMenuRef}>
                                <button
                                    onClick={handleShare}
                                    className="p-2 rounded-full hover:bg-heritage-gold/10 transition-colors"
                                    aria-label="Chia sẻ bài viết"
                                >
                                    <Share2 className="size-4" />
                                </button>
                                <AnimatePresence>
                                    {showShareMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-heritage-gold/20 overflow-hidden z-50"
                                        >
                                            <button
                                                onClick={shareToFacebook}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-altar-wood hover:bg-heritage-gold/5 transition-colors"
                                            >
                                                <Facebook className="size-4 text-[#1877F2]" />
                                                Facebook
                                            </button>
                                            <button
                                                onClick={shareToTwitter}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-altar-wood hover:bg-heritage-gold/5 transition-colors"
                                            >
                                                <Twitter className="size-4 text-[#1DA1F2]" />
                                                X (Twitter)
                                            </button>
                                            <div className="h-px bg-heritage-gold/10" />
                                            <button
                                                onClick={copyLink}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-altar-wood hover:bg-heritage-gold/5 transition-colors"
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="size-4 text-green-500" />
                                                        <span className="text-green-600">Đã sao chép!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="size-4 text-altar-wood/50" />
                                                        Sao chép liên kết
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <button className="p-2 rounded-full hover:bg-heritage-gold/10 transition-colors">
                                <Bookmark className="size-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Article Content */}
                <motion.article
                    className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-heritage-gold/10 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div
                        className="prose prose-lg prose-slate max-w-none
                            prose-headings:font-serif prose-headings:text-altar-wood prose-headings:mt-10 prose-headings:mb-4
                            prose-h2:text-2xl prose-h2:border-b prose-h2:border-heritage-gold/20 prose-h2:pb-2
                            prose-h3:text-xl
                            prose-p:text-altar-wood/70 prose-p:leading-relaxed prose-p:mb-6
                            prose-a:text-heritage-red prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:border-heritage-gold prose-blockquote:bg-heritage-gold/5 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:my-8 prose-blockquote:py-4 prose-blockquote:px-6
                            prose-img:rounded-xl prose-img:shadow-md
                            prose-strong:text-altar-wood
                            prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
                            prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
                            prose-li:mb-3 prose-li:text-altar-wood/70 prose-li:leading-relaxed
                            first:prose-p:first-letter:text-5xl first:prose-p:first-letter:font-serif first:prose-p:first-letter:text-heritage-red first:prose-p:first-letter:float-left first:prose-p:first-letter:mr-3 first:prose-p:first-letter:leading-none"
                        dangerouslySetInnerHTML={{
                            __html: post.content || "",
                        }}
                    />
                </motion.article>

                {/* Tags */}
                {post.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-8">
                        <Tag className="size-4 text-altar-wood/40" />
                        {post.tags.map((tag) => (
                            <span
                                key={tag.id}
                                className="px-3 py-1 bg-white border border-heritage-gold/10 rounded-full text-xs font-medium text-altar-wood/60"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Back Link */}
                <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-heritage-red font-medium text-sm hover:gap-3 transition-all mb-12"
                >
                    <ArrowLeft className="size-4" />
                    Quay lại danh sách bài viết
                </Link>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-serif font-bold text-altar-wood mb-6">
                            Bài viết liên quan
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedPosts.map((rp) => (
                                <Link
                                    key={rp.id}
                                    href={`/blog/${rp.slug}`}
                                    className="group block bg-white rounded-xl overflow-hidden border border-heritage-gold/10 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="aspect-[16/10] bg-heritage-red/5 overflow-hidden">
                                        {rp.cover_image_url ? (
                                            <img
                                                src={rp.cover_image_url}
                                                alt={rp.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                style={rp.is_featured ? { objectPosition: "0 8%" } : undefined}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-heritage-red/5 to-heritage-gold/5">
                                                <span className="text-heritage-gold/30 text-3xl font-serif">
                                                    族
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-sm text-altar-wood group-hover:text-heritage-red transition-colors line-clamp-2 mb-2">
                                            {rp.title}
                                        </h3>
                                        <span className="flex items-center gap-1 text-heritage-red text-xs font-medium group-hover:gap-2 transition-all">
                                            Đọc thêm
                                            <ArrowRight className="size-3" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
