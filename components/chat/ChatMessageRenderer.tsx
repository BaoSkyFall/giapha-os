"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  chatSanitizeSchema,
  isExternalUrl,
  isSafeUrl,
  normalizeStreamingMarkdown,
} from "./markdown-config";

export interface ChatMessageRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

function extractTextFromChildren(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromChildren).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromChildren(node.props.children);
  }
  return "";
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const rawCode = useMemo(() => extractTextFromChildren(children).replace(/\n$/, ""), [children]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="my-3 rounded-xl border border-[#E8E2D8] bg-[#FAF8F3] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3EFE6] border-b border-[#E8E2D8] text-xs text-[#5C5750]">
        <span className="font-mono font-medium">Mã / Dữ liệu</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#E8E2D8]/70 text-[#292725] transition-colors"
          aria-label="Sao chép đoạn mã"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#227C44]" />
              <span className="text-[#227C44] font-medium">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-[#292725] m-0">
        {children}
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  // Không dùng H1 quá lớn trong chat — hạ xuống H2
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  a: ({ href, children, title }) => {
    if (!isSafeUrl(href)) {
      return <span className="text-[#5C5750]">{children}</span>;
    }
    const safeHref = href!.trim();
    if (isExternalUrl(safeHref)) {
      return (
        <a
          href={safeHref}
          title={title}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1"
        >
          <span>{children}</span>
          <ExternalLink className="w-3.5 h-3.5 inline shrink-0" aria-hidden="true" />
        </a>
      );
    }
    return (
      <Link href={safeHref} title={title}>
        {children}
      </Link>
    );
  },
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table: ({ children }) => (
    <div className="my-3 w-full overflow-x-auto rounded-xl border border-[#E8E2D8]">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#FAF8F3] border-b border-[#E8E2D8]">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3.5 py-2.5 font-semibold text-[#292725] whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3.5 py-2.5 border-t border-[#E8E2D8] text-[#292725] align-top">{children}</td>
  ),
  // Không render ảnh tự do từ AI response để tránh tracking pixel / layout vỡ
  img: ({ alt }) => (alt ? <span className="text-xs text-[#5C5750]">[{alt}]</span> : null),
};

export default function ChatMessageRenderer({
  content,
  isStreaming = false,
  className = "",
}: ChatMessageRendererProps) {
  const normalizedContent = useMemo(
    () => normalizeStreamingMarkdown(content, isStreaming),
    [content, isStreaming]
  );

  return (
    <div
      className={`chat-markdown ${className}`.trim()}
      data-streaming={isStreaming ? "true" : "false"}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, chatSanitizeSchema]]}
        components={markdownComponents}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
