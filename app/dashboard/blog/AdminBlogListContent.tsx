"use client";

import { BlogPostWithDetails } from "@/types";
import {
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit3,
    Eye,
    FileText,
    Filter,
    MoreVertical,
    PenSquare,
    Search,
    Tags,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface AdminBlogListContentProps {
    posts: BlogPostWithDetails[];
    total: number;
    stats: { total: number; published: number; draft: number };
    currentPage: number;
    currentStatus?: string;
    currentSearch?: string;
}

const statusConfig = {
    published: {
        label: "Đã xuất bản",
        dotColor: "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]",
        textColor: "text-green-700",
    },
    draft: {
        label: "Bản nháp",
        dotColor: "bg-altar-wood/40",
        textColor: "text-altar-wood/50",
    },
    review: {
        label: "Chờ duyệt",
        dotColor: "bg-amber-500",
        textColor: "text-amber-700",
    },
} as const;

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function AdminBlogListContent({
    posts,
    total,
    stats,
    currentPage,
    currentStatus,
    currentSearch,
}: AdminBlogListContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchInput, setSearchInput] = useState(currentSearch || "");
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

    const pageSize = 10;
    const totalPages = Math.ceil(total / pageSize);

    const buildUrl = (overrides: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(overrides)) {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }
        if ("status" in overrides || "search" in overrides) {
            params.delete("page");
        }
        const qs = params.toString();
        return `/dashboard/blog${qs ? `?${qs}` : ""}`;
    };

    const navigate = (url: string) => {
        startTransition(() => router.push(url));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(buildUrl({ search: searchInput || undefined }));
    };

    const handleDelete = async (postId: string) => {
        if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;

        const res = await fetch(`/api/blog/${postId}`, { method: "DELETE" });
        if (res.ok) {
            router.refresh();
        }
    };

    const toggleSelectAll = () => {
        if (selectedPosts.size === posts.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(posts.map((p) => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedPosts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const statCards = [
        {
            label: "Tổng bài viết",
            value: stats.total.toString().padStart(2, "0"),
            icon: <FileText className="size-7 text-heritage-red" />,
            bg: "bg-heritage-red/10",
        },
        {
            label: "Đã xuất bản",
            value: stats.published.toString().padStart(2, "0"),
            icon: <CheckCircle className="size-7 text-green-700" />,
            bg: "bg-green-100",
        },
        {
            label: "Bản nháp",
            value: stats.draft.toString().padStart(2, "0"),
            icon: <Clock className="size-7 text-amber-700" />,
            bg: "bg-amber-100",
        },
    ];

    type TabKey = "" | "published" | "draft";
    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: "", label: "Tất cả", count: stats.total },
        { key: "published", label: "Đã xuất bản", count: stats.published },
        { key: "draft", label: "Bản nháp", count: stats.draft },
    ];

    return (
        <div
            className={`flex-1 overflow-auto p-6 lg:px-10 ${isPending ? "opacity-60" : ""}`}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="font-serif text-3xl md:text-4xl font-black text-heritage-red">
                        Quản Lý Bài Viết
                    </h2>
                    <p className="text-altar-wood/60 font-serif italic mt-1">
                        Lưu giữ tinh hoa và truyền thống dòng họ Phạm Phú qua
                        từng trang viết.
                    </p>
                </div>
                <Link
                    href="/dashboard/blog/new"
                    className="flex items-center justify-center gap-2 bg-heritage-red hover:bg-heritage-red/90 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all hover:-translate-y-0.5"
                >
                    <PenSquare className="size-5" />
                    + Viết bài mới
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white border-2 border-heritage-gold/20 rounded-xl p-6 flex items-center gap-5 shadow-sm"
                    >
                        <div className={`${stat.bg} p-3 rounded-xl`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-altar-wood/50 text-sm font-medium">
                                {stat.label}
                            </p>
                            <p className="text-3xl font-serif font-black text-altar-wood">
                                {stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                <div className="flex border-b border-heritage-gold/20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() =>
                                navigate(
                                    buildUrl({
                                        status: tab.key || undefined,
                                    })
                                )
                            }
                            className={`px-6 py-3 text-sm font-medium transition-colors ${(currentStatus || "") === tab.key
                                    ? "border-b-2 border-heritage-red text-heritage-red font-bold"
                                    : "text-altar-wood/50 hover:text-altar-wood/70"
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={handleSearch}
                        className="relative flex-1 min-w-[300px]"
                    >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-altar-wood/40" />
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-white border border-heritage-gold/20 rounded-lg focus:ring-heritage-red focus:border-heritage-red text-sm text-altar-wood placeholder:text-altar-wood/30"
                            placeholder="Tìm theo tiêu đề, tác giả..."
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </form>
                    <button className="flex items-center gap-2 px-4 py-2 border border-heritage-gold/20 bg-white rounded-lg text-altar-wood/60 hover:bg-heritage-gold/5 text-sm font-medium transition-colors">
                        <Filter className="size-4" />
                        Bộ lọc
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="bg-rice-paper px-4 py-2.5 rounded-t-xl border-x border-t border-heritage-gold/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            className="rounded text-heritage-red focus:ring-heritage-red border-heritage-gold/30"
                            type="checkbox"
                            checked={
                                selectedPosts.size === posts.length &&
                                posts.length > 0
                            }
                            onChange={toggleSelectAll}
                        />
                        <span className="text-xs font-bold text-altar-wood/60">
                            CHỌN TẤT CẢ
                        </span>
                    </label>
                    {selectedPosts.size > 0 && (
                        <>
                            <div className="h-4 w-px bg-heritage-gold/20" />
                            <div className="flex items-center gap-2">
                                <button className="text-altar-wood/60 hover:text-red-600 flex items-center gap-1 text-xs font-bold transition-colors">
                                    <Trash2 className="size-3.5" />
                                    Xóa đã chọn
                                </button>
                                <button className="text-altar-wood/60 hover:text-heritage-gold flex items-center gap-1 text-xs font-bold transition-colors">
                                    <Tags className="size-3.5" />
                                    Đổi danh mục
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <p className="text-[11px] text-altar-wood/40 italic">
                    Đang hiển thị {posts.length} trong tổng số {total} bài viết
                </p>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-b border-heritage-gold/20 rounded-b-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-rice-paper/50 border-b border-heritage-gold/20 text-altar-wood/50 text-[11px] uppercase tracking-wider font-bold">
                            <th className="py-4 px-6 w-10" />
                            <th className="py-4 px-6">Tiêu đề bài viết</th>
                            <th className="py-4 px-6">Danh mục</th>
                            <th className="py-4 px-6">Trạng thái</th>
                            <th className="py-4 px-6">Ngày đăng</th>
                            <th className="py-4 px-6 text-center">
                                Lượt xem
                            </th>
                            <th className="py-4 px-6 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-heritage-gold/10">
                        {posts.map((post) => {
                            const cfg =
                                statusConfig[post.status] ||
                                statusConfig.draft;
                            return (
                                <tr
                                    key={post.id}
                                    className="hover:bg-rice-paper/50 transition-colors"
                                >
                                    <td className="py-4 px-6">
                                        <input
                                            className="rounded text-heritage-red focus:ring-heritage-red border-heritage-gold/30"
                                            type="checkbox"
                                            checked={selectedPosts.has(
                                                post.id
                                            )}
                                            onChange={() =>
                                                toggleSelect(post.id)
                                            }
                                        />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <Link
                                                href={`/blog/${post.slug}`}
                                                className="text-altar-wood font-bold hover:text-heritage-red transition-colors leading-tight"
                                            >
                                                {post.title}
                                            </Link>
                                            <span className="text-[10px] text-altar-wood/40 mt-1 uppercase">
                                                Slug: {post.slug}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-wrap gap-1">
                                            {post.categories
                                                .slice(0, 2)
                                                .map((cat) => (
                                                    <span
                                                        key={cat.id}
                                                        className={`${cat.color} px-2.5 py-1 rounded-full text-[11px] font-bold`}
                                                    >
                                                        {cat.name}
                                                    </span>
                                                ))}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div
                                            className={`flex items-center gap-1.5 ${cfg.textColor}`}
                                        >
                                            <span
                                                className={`size-2 rounded-full ${cfg.dotColor}`}
                                            />
                                            <span className="text-xs font-bold">
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-altar-wood/50">
                                        {formatDate(
                                            post.published_at ||
                                            post.updated_at
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center text-sm font-bold text-altar-wood/70">
                                        {post.views.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 text-altar-wood/40">
                                            <Link
                                                href={`/blog/${post.slug}`}
                                                className="hover:text-heritage-gold transition-colors"
                                                title="Xem"
                                            >
                                                <Eye className="size-4" />
                                            </Link>
                                            <Link
                                                href={`/dashboard/blog/${post.id}`}
                                                className="hover:text-heritage-red transition-colors"
                                                title="Sửa"
                                            >
                                                <Edit3 className="size-4" />
                                            </Link>
                                            <button
                                                onClick={() =>
                                                    handleDelete(post.id)
                                                }
                                                className="hover:text-red-600 transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {posts.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="py-16 text-center text-altar-wood/40"
                                >
                                    <Search className="size-8 mx-auto mb-3" />
                                    <p className="font-medium">
                                        Không tìm thấy bài viết
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="px-6 py-4 bg-rice-paper/50 border-t border-heritage-gold/10 flex items-center justify-between">
                        <p className="text-xs text-altar-wood/50 font-medium">
                            Trang {currentPage} / {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() =>
                                    currentPage > 1 &&
                                    navigate(
                                        buildUrl({
                                            page: String(currentPage - 1),
                                        })
                                    )
                                }
                                disabled={currentPage <= 1}
                                className="size-8 flex items-center justify-center rounded border border-heritage-gold/20 bg-white text-altar-wood/30 disabled:cursor-not-allowed hover:bg-heritage-red/5 disabled:hover:bg-white"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1
                            ).map((p) => (
                                <button
                                    key={p}
                                    onClick={() =>
                                        navigate(
                                            buildUrl({ page: String(p) })
                                        )
                                    }
                                    className={`size-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === currentPage
                                            ? "border border-heritage-red bg-heritage-red text-white"
                                            : "border border-heritage-gold/20 bg-white text-altar-wood/60 hover:bg-heritage-red/5"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() =>
                                    currentPage < totalPages &&
                                    navigate(
                                        buildUrl({
                                            page: String(currentPage + 1),
                                        })
                                    )
                                }
                                disabled={currentPage >= totalPages}
                                className="size-8 flex items-center justify-center rounded border border-heritage-gold/20 bg-white text-altar-wood/30 disabled:cursor-not-allowed hover:bg-heritage-red/5 disabled:hover:bg-white"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-altar-wood/40 text-[11px] pb-8 italic">
                © 2026 Hội Đồng Gia Tộc Phạm Phú. Hệ thống quản trị nội dung
                bảo mật cao.
            </footer>
        </div>
    );
}
