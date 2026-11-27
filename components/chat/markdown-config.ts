import { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeOptions } from "rehype-sanitize";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Kiểm tra URL có an toàn để render thành thẻ <a> hay không.
 * Chặn tuyệt đối javascript:, data:, vbscript: và protocol-relative (//).
 */
export function isSafeUrl(href?: string | null): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;

  // Allow relative app routes (/events, /tra-cuu-ai) and hash anchors (#section)
  // Block protocol-relative URLs like //evil.com
  if ((trimmed.startsWith("/") && !trimmed.startsWith("//")) || trimmed.startsWith("#")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

export function isExternalUrl(href: string): boolean {
  const trimmed = href.trim();
  return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed);
}

/**
 * Schema sanitize chặt chẽ cho nội dung Markdown của AI Chatbot.
 * Không cho phép script, style, iframe, form hoặc bất kỳ event handler nào.
 */
export const chatSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "del",
    "s",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "span",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ["href", "title"],
    code: ["className"],
    th: ["align"],
    td: ["align"],
  },
  protocols: {
    href: ["http", "https", "mailto", "tel"],
  },
  strip: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "button"],
};

/**
 * Chuẩn hóa nhẹ nội dung đang stream để tránh vỡ layout khi code fence chưa đóng.
 * Tuyệt đối không xóa ký tự Markdown hợp lệ bằng regex.
 */
export function normalizeStreamingMarkdown(content: string, isStreaming = false): string {
  if (!content) return "";
  if (!isStreaming) return content;

  const fenceMatches = content.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    return `${content}\n\`\`\``;
  }
  return content;
}
