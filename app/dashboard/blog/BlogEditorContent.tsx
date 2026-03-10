"use client";

import { BlogCategory, BlogPostWithDetails, BlogTag } from "@/types";
import {
    ArrowLeft,
    Bold,
    Eye,
    Heading1,
    Heading2,
    Image as ImageIcon,
    Italic,
    List,
    ListOrdered,
    Loader2,
    Quote,
    Save,
    Send,
    Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface BlogEditorContentProps {
    post?: BlogPostWithDetails | null;
    categories: BlogCategory[];
    tags: BlogTag[];
    authorId: string;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

export default function BlogEditorContent({
    post,
    categories,
    tags,
    authorId,
}: BlogEditorContentProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentImageInputRef = useRef<HTMLInputElement>(null);
    const isEditing = !!post;

    const [title, setTitle] = useState(post?.title || "");
    const [slug, setSlug] = useState(post?.slug || "");
    const [content, setContent] = useState(post?.content || "");
    const [excerpt, setExcerpt] = useState(post?.excerpt || "");
    const [coverImageUrl, setCoverImageUrl] = useState(
        post?.cover_image_url || ""
    );
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        post?.categories.map((c) => c.id) || []
    );
    const [selectedTags, setSelectedTags] = useState<string[]>(
        post?.tags.map((t) => t.id) || []
    );
    const [status, setStatus] = useState<"draft" | "published">(
        (post?.status as "draft" | "published") || "draft"
    );

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    const handleTitleChange = (value: string) => {
        setTitle(value);
        if (!isEditing) {
            setSlug(slugify(value));
        }
    };

    const uploadImage = async (
        file: File,
        folder: string
    ): Promise<string | null> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Upload failed");
            return null;
        }

        const data = await res.json();
        return data.url;
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError("");

        const url = await uploadImage(file, "blog/covers");
        if (url) {
            setCoverImageUrl(url);
        }

        setIsUploading(false);
    };

    const handleContentImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError("");

        const url = await uploadImage(file, "blog/content");
        if (url) {
            setContent(
                (prev) =>
                    prev +
                    `\n<img src="${url}" alt="${file.name}" class="rounded-xl" />\n`
            );
        }

        setIsUploading(false);
    };

    const handleSave = async (publishStatus: "draft" | "published") => {
        if (!title.trim()) {
            setError("Vui lòng nhập tiêu đề bài viết");
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            const body = {
                post: {
                    title,
                    slug: slug || slugify(title),
                    content,
                    excerpt,
                    cover_image_url: coverImageUrl || null,
                    status: publishStatus,
                    author_id: authorId,
                },
                categoryIds: selectedCategories,
                tagIds: selectedTags,
            };

            const url = isEditing
                ? `/api/blog/${post!.id}`
                : "/api/blog";
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Save failed");
            }

            router.push("/dashboard/blog");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const insertTag = (before: string, after: string = "") => {
        setContent((prev) => prev + `${before}${after}`);
    };

    const toggleCategory = (id: string) => {
        setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const toggleTag = (id: string) => {
        setSelectedTags((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex-1 overflow-auto p-6 lg:px-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/blog"
                        className="p-2 rounded-lg border border-heritage-gold/20 hover:bg-heritage-gold/5 transition-colors"
                    >
                        <ArrowLeft className="size-5 text-altar-wood/60" />
                    </Link>
                    <h2 className="font-serif text-2xl md:text-3xl font-black text-heritage-red">
                        {isEditing ? "Chỉnh Sửa Bài Viết" : "Viết Bài Mới"}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSave("draft")}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 border border-heritage-gold/20 bg-white hover:bg-heritage-gold/5 rounded-lg text-sm font-bold text-altar-wood/70 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        Lưu nháp
                    </button>
                    <button
                        onClick={() => handleSave("published")}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-heritage-red hover:bg-heritage-red/90 text-white rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Send className="size-4" />
                        )}
                        Xuất bản
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6">
                {/* Editor */}
                <div className="flex-1">
                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Tiêu đề bài viết..."
                        className="w-full text-3xl md:text-4xl font-serif font-bold text-altar-wood placeholder:text-altar-wood/20 bg-transparent border-none focus:ring-0 p-0 mb-2"
                    />
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-xs text-altar-wood/40">Slug:</span>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="text-xs text-altar-wood/50 bg-transparent border-none focus:ring-0 p-0 flex-1"
                        />
                    </div>

                    {/* Cover Image */}
                    <div className="mb-6">
                        {coverImageUrl ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-heritage-gold/20">
                                <img
                                    src={coverImageUrl}
                                    alt="Cover"
                                    className="w-full h-64 object-cover lg:object-contain"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 text-white text-xs font-bold rounded-lg hover:bg-black/80 transition-colors"
                                >
                                    Đổi ảnh bìa
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-48 border-2 border-dashed border-heritage-gold/30 rounded-xl flex flex-col items-center justify-center gap-2 text-altar-wood/40 hover:border-heritage-red/30 hover:text-heritage-red/40 transition-colors disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <Loader2 className="size-6 animate-spin" />
                                ) : (
                                    <Upload className="size-6" />
                                )}
                                <span className="text-sm font-medium">
                                    {isUploading
                                        ? "Đang tải lên..."
                                        : "Thêm ảnh bìa"}
                                </span>
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverUpload}
                        />
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center flex-wrap gap-1 p-2 bg-white rounded-t-xl border-x border-t border-heritage-gold/20">
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Đậm"
                            onClick={() =>
                                insertTag("<strong>", "Chữ đậm</strong>")
                            }
                        >
                            <Bold className="size-4 text-altar-wood/60" />
                        </button>
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Nghiêng"
                            onClick={() =>
                                insertTag("<em>", "Chữ nghiêng</em>")
                            }
                        >
                            <Italic className="size-4 text-altar-wood/60" />
                        </button>
                        <div className="h-5 w-px bg-heritage-gold/20 mx-1" />
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Heading 1"
                            onClick={() =>
                                insertTag("\n<h2>", "Tiêu đề</h2>\n")
                            }
                        >
                            <Heading1 className="size-4 text-altar-wood/60" />
                        </button>
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Heading 2"
                            onClick={() =>
                                insertTag("\n<h3>", "Tiêu đề phụ</h3>\n")
                            }
                        >
                            <Heading2 className="size-4 text-altar-wood/60" />
                        </button>
                        <div className="h-5 w-px bg-heritage-gold/20 mx-1" />
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Danh sách"
                            onClick={() =>
                                insertTag("\n<ul>\n<li>", "Mục</li>\n</ul>\n")
                            }
                        >
                            <List className="size-4 text-altar-wood/60" />
                        </button>
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Danh sách số"
                            onClick={() =>
                                insertTag("\n<ol>\n<li>", "Mục</li>\n</ol>\n")
                            }
                        >
                            <ListOrdered className="size-4 text-altar-wood/60" />
                        </button>
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Trích dẫn"
                            onClick={() =>
                                insertTag(
                                    "\n<blockquote>",
                                    "Trích dẫn</blockquote>\n"
                                )
                            }
                        >
                            <Quote className="size-4 text-altar-wood/60" />
                        </button>
                        <div className="h-5 w-px bg-heritage-gold/20 mx-1" />
                        <button
                            className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                            title="Chèn ảnh"
                            onClick={() =>
                                contentImageInputRef.current?.click()
                            }
                        >
                            <ImageIcon className="size-4 text-altar-wood/60" />
                        </button>
                        <input
                            ref={contentImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleContentImageUpload}
                        />
                        <div className="ml-auto">
                            <Link
                                href={
                                    isEditing
                                        ? `/blog/${post!.slug}`
                                        : "#"
                                }
                                className="p-2 rounded hover:bg-heritage-gold/10 transition-colors"
                                title="Xem trước"
                            >
                                <Eye className="size-4 text-altar-wood/60" />
                            </Link>
                        </div>
                    </div>

                    {/* Content Textarea */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Viết nội dung bài viết bằng HTML..."
                        className="w-full min-h-[500px] p-4 bg-white border-x border-b border-heritage-gold/20 rounded-b-xl text-altar-wood text-sm font-mono resize-y focus:ring-heritage-red focus:border-heritage-red placeholder:text-altar-wood/20"
                    />
                </div>

                {/* Sidebar */}
                <div className="w-full xl:w-80 space-y-6">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-heritage-gold/20 p-5">
                        <h3 className="font-serif font-bold text-altar-wood mb-3">
                            Trạng thái
                        </h3>
                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(
                                    e.target.value as "draft" | "published"
                                )
                            }
                            className="w-full px-3 py-2 bg-rice-paper border border-heritage-gold/20 rounded-lg text-sm text-altar-wood focus:ring-heritage-red focus:border-heritage-red"
                        >
                            <option value="draft">Bản nháp</option>
                            <option value="published">Đã xuất bản</option>
                        </select>
                    </div>

                    {/* Categories */}
                    <div className="bg-white rounded-xl border border-heritage-gold/20 p-5">
                        <h3 className="font-serif font-bold text-altar-wood mb-3">
                            Danh mục
                        </h3>
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <label
                                    key={cat.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(
                                            cat.id
                                        )}
                                        onChange={() => toggleCategory(cat.id)}
                                        className="rounded text-heritage-red focus:ring-heritage-red border-heritage-gold/30"
                                    />
                                    <span
                                        className={`${cat.color} px-2 py-0.5 rounded-full text-xs font-bold`}
                                    >
                                        {cat.name}
                                    </span>
                                </label>
                            ))}
                            {categories.length === 0 && (
                                <p className="text-xs text-altar-wood/40 italic">
                                    Chưa có danh mục nào
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white rounded-xl border border-heritage-gold/20 p-5">
                        <h3 className="font-serif font-bold text-altar-wood mb-3">
                            Thẻ (Tags)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTags.includes(tag.id)
                                        ? "bg-heritage-red text-white"
                                        : "bg-rice-paper text-altar-wood/60 border border-heritage-gold/20 hover:border-heritage-red/30"
                                        }`}
                                >
                                    {tag.name}
                                </button>
                            ))}
                            {tags.length === 0 && (
                                <p className="text-xs text-altar-wood/40 italic">
                                    Chưa có thẻ nào
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Excerpt */}
                    <div className="bg-white rounded-xl border border-heritage-gold/20 p-5">
                        <h3 className="font-serif font-bold text-altar-wood mb-3">
                            Trích dẫn (Excerpt)
                        </h3>
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="Mô tả ngắn cho bài viết..."
                            rows={3}
                            className="w-full px-3 py-2 bg-rice-paper border border-heritage-gold/20 rounded-lg text-sm text-altar-wood focus:ring-heritage-red focus:border-heritage-red placeholder:text-altar-wood/30 resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
