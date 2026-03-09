"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
    Bold,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Quote,
    Redo,
    Strikethrough,
    Undo,
} from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({
    content,
    onChange,
    placeholder = "Viết ghi chú...",
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class:
                    "prose-editor min-h-[120px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm text-stone-900 outline-none focus:outline-none",
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            // If editor is "empty" (only an empty paragraph), send empty string
            onChange(html === "<p></p>" ? "" : html);
        },
    });

    // Sync external content changes (e.g. initial load)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || "");
        }
        // Only run when content prop changes, not on every editor update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    if (!editor) return null;

    const ToolbarButton = ({
        onClick,
        isActive = false,
        title,
        children,
    }: {
        onClick: () => void;
        isActive?: boolean;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-lg transition-all duration-150 ${isActive
                ? "bg-amber-100 text-amber-700 shadow-xs"
                : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                }`}
        >
            {children}
        </button>
    );

    const iconSize = "size-4";

    return (
        <div className="rounded-xl border border-stone-300 shadow-sm bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-stone-200 bg-stone-50/80">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Đậm (Ctrl+B)"
                >
                    <Bold className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Nghiêng (Ctrl+I)"
                >
                    <Italic className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    title="Gạch ngang"
                >
                    <Strikethrough className={iconSize} />
                </ToolbarButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="Tiêu đề lớn"
                >
                    <Heading2 className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 3 })}
                    title="Tiêu đề nhỏ"
                >
                    <Heading3 className={iconSize} />
                </ToolbarButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="Danh sách"
                >
                    <List className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="Danh sách có số"
                >
                    <ListOrdered className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    title="Trích dẫn"
                >
                    <Quote className={iconSize} />
                </ToolbarButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Hoàn tác (Ctrl+Z)"
                >
                    <Undo className={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Làm lại (Ctrl+Y)"
                >
                    <Redo className={iconSize} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <div className="relative">
                <EditorContent editor={editor} />
                {editor.isEmpty && (
                    <div className="absolute top-3 left-4 text-sm text-stone-500 pointer-events-none select-none">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
}
